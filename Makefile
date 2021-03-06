SHELL := /bin/bash
MAKE_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

start-elastic-6:
	open http://localhost:5602/
	docker compose -f docker-compose-elastic-6.2.4.yml up

stop-elastic-6:
	docker compose -f docker-compose-elastic-6.2.4.yml down

start-elastic-7:
	docker compose up

stop-elastic-7:
	docker compose down

populate-index:
	node src/populate-index.js