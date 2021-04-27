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

(async () => {
  try {
    const esClient = await connectToElastic();
    const indexName = 'teomrd';

    const exists = await doesIndexExist(esClient, indexName);
    if(exists) {
      throw new Error(`The index "${indexName}" already exists!`);
    }
    
    const schema = await fs.readFileSync('schemas/assets.json', { encoding:'utf8' })
    const parsedSchema = JSON.parse(assetsSchema);

    await esClient.indices.create({
      index: indexName,
      body: parsedSchema
    });
    console.log(`Elastic index ${indexName} has been created 🎉`);
  } catch (error) {
    console.log(error);
  }
})();