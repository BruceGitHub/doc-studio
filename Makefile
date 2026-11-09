SHELL := /bin/sh

IMAGE   ?= docstudio:local
VAULT   ?= $(CURDIR)/fixtures/vault-demo
PORT    ?= 4321
COMPOSE ?= docker compose

COMPOSE_ENV = DOCSTUDIO_VAULT="$(VAULT)" DOCSTUDIO_PORT="$(PORT)"

.DEFAULT_GOAL := help

.PHONY: help build start stop restart logs ps index doctor

help: ## Show this help
	@printf 'Doc Studio\n\n'
	@printf '  make build      build the Docker image\n'
	@printf '  make start      build and start the server on http://127.0.0.1:%s\n' '$(PORT)'
	@printf '  make stop       stop the server\n'
	@printf '  make restart    restart the server\n'
	@printf '  make logs       follow container logs\n'
	@printf '  make ps         show container status\n'
	@printf '  make index      index the vault with no network at all\n'
	@printf '  make doctor     run the doctor with no network (exit 1 on errors)\n\n'
	@printf '  VAULT=%s\n' '$(VAULT)'
	@printf '  PORT=%s\n\n' '$(PORT)'
	@printf '  Examples:\n'
	@printf '    make start VAULT=$(HOME)/notes/work PORT=8080\n'
	@printf '    make index VAULT=$(HOME)/notes/work\n\n'

build: ## Build the Docker image
	$(COMPOSE) build

start: build ## Build and start the server
	$(COMPOSE_ENV) $(COMPOSE) up -d
	@printf '\n  Doc Studio -> http://127.0.0.1:%s\n\n' '$(PORT)'

stop: ## Stop the server
	$(COMPOSE) down

restart: stop start ## Restart the server

logs: ## Follow container logs
	$(COMPOSE) logs -f --tail=50

ps: ## Show container status
	$(COMPOSE) ps

index: ## Index the vault with no network at all
	docker run --rm --network none \
		-e DOCSTUDIO_BLOCK_EGRESS=0 \
		-v "$(VAULT):/vault:ro" \
		$(IMAGE) index /vault

doctor: ## Run the doctor with no network at all
	docker run --rm --network none \
		-e DOCSTUDIO_BLOCK_EGRESS=0 \
		-v "$(VAULT):/vault:ro" \
		$(IMAGE) doctor /vault
