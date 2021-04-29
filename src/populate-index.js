#!/usr/bin/env node

const fs = require('fs');
const { Client } = require("@elastic/elasticsearch");

const connectToElastic = ({
  protocol = "http",
  host = "localhost",
  port = "9200",
  maxRetries = 5,
  requestTimeout = 60000
} = {}) => {
  const esClient = new Client({
    node: `${protocol}://${host}:${port}`,
    maxRetries,
    requestTimeout
  });

  return esClient;
};

const doesIndexExist = async (esClient, indexName) => {
  const { body: existingIndices } = await esClient.cat.indices({
    format: 'json',
  });
  const existingIndexNames = existingIndices.map(({ index }) => index);

  return existingIndexNames.some(name => name === indexName)
};


const question = (q) => {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    readline.question(q, answer => {
      resolve(answer);
      readline.close()
    });  
  })
}

const readFileAsArray = filePath =>
  fs
    .readFileSync(filePath)
    .toString()
    .split('\n');

const isJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

const chunk = (arr, chunkSize = 10) => arr.reduce((acc, curr) => {
  const lastArray = acc.slice(-1)[0] || [];
  return lastArray.length >= chunkSize ? [
    ...acc,
    [curr]
  ] : [
    ...acc.slice(0, -1),
    [
      ...lastArray,
      curr
    ]
  ];
}, []);

(async () => {
  try {
    const args = process.argv.slice(2);
    const [firstArg] = args;
    
    const indexName = firstArg || await question(`What's the name of index you want to create? \n`);

    const esClient = await connectToElastic();
    const exists = await doesIndexExist(esClient, indexName);
    if(exists) {
      throw new Error(`The index "${indexName}" already exists!`);
    }
    console.log(`Alrighty.. index "${indexName}" will be created!`);

    const schema = await fs.readFileSync('schemas/assets.json', { encoding:'utf8' });
    const parsedSchema = JSON.parse(schema);

    await esClient.indices.create({
      index: indexName,
      body: parsedSchema
    });

    console.log(`Index "${indexName}" created! ✅`);
    console.log(`"${indexName}" will now be hydrated with assets!`);
    
    const assetsAsStrings = await readFileAsArray('data/assets.ndjson');
    const assets = assetsAsStrings
      .filter(l => isJSON(l))
      .map(a => JSON.parse(a));

    const numberOfRequestsInParallel = 3;
    const numberOfBatchDocuments = 5;
    
    const assetsInBatches = chunk(assets, numberOfBatchDocuments);
    const assetsIndexRequests = chunk(assetsInBatches, numberOfRequestsInParallel);

    const getBulkRequest = (assets) => esClient.bulk({
      refresh: true,
      body: assets
        .flatMap(doc => [{
          index: { _index: indexName, _id: doc.id, _type: 'asset' } },
          doc
        ])
    });

    for (const requests of assetsIndexRequests) {
      await Promise.all(requests.map(r => getBulkRequest(r)))
      const index = assetsIndexRequests.indexOf(requests);
      console.log(`${index+1}/${assetsIndexRequests.length} batches done!`);
    }

    const { body: countResponse } = await esClient.count({ index: indexName });
    const { count } = countResponse;

    console.log(`Elastic index ${indexName} has been created 🎉 and populated with data. No: ${count}`);
  } catch (error) {
    console.log(error.message);
  }
})();