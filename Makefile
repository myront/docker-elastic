SHELL := /bin/bash
MAKE_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

start-elastic-6:
	docker-compose -f docker-compose-elastic-6.2.4.yml up

stop-elastic-6:
	docker-compose -f docker-compose-elastic-6.2.4.yml up

start-elastic-7:
	docker-compose up

stop-elastic-7:
	docker-compose down

populate-index:
	node populate-index.js