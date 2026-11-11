SHELL := /bin/sh

IMAGE   ?= docstudio:local
VAULT   ?= $(CURDIR)/fixtures/vault-demo
PORT    ?= 4321
COMPOSE ?= docker compose

# One Compose project per port, so several vaults can run side by side. The
# default port keeps the historical `docstudio` project name (and its running
# container) untouched.
PROJECT ?= $(if $(filter 4321,$(PORT)),docstudio,docstudio-$(PORT))

# The container cannot spawn a host editor, so it needs the vault path as the
# browser machine sees it to build vscode:// links. On WSL that is a Windows
# path; elsewhere it is the same absolute path.
HOST_VAULT ?= $(shell if command -v wslpath >/dev/null 2>&1; then wslpath -w "$(VAULT)"; else printf '%s' "$(VAULT)"; fi)

COMPOSE_ENV = DOCSTUDIO_PROJECT="$(PROJECT)" DOCSTUDIO_VAULT="$(VAULT)" DOCSTUDIO_HOST_VAULT="$(HOST_VAULT)" DOCSTUDIO_PORT="$(PORT)"
COMPOSE_PROJECT = $(COMPOSE) -p $(PROJECT)

.DEFAULT_GOAL := help

.PHONY: help build start stop restart logs ps instances stop-all index doctor

help: ## Show this help
	@printf 'Doc Studio\n\n'
	@printf '  make build      build the Docker image\n'
	@printf '  make start      build and start the server on http://127.0.0.1:%s\n' '$(PORT)'
	@printf '  make stop       stop the instance for PORT (project %s)\n' '$(PROJECT)'
	@printf '  make restart    restart the instance for PORT\n'
	@printf '  make logs       follow container logs for PORT\n'
	@printf '  make ps         show container status for PORT\n'
	@printf '  make instances  list every running Doc Studio instance\n'
	@printf '  make stop-all   stop every Doc Studio instance from this repo\n'
	@printf '  make index      index the vault with no network at all\n'
	@printf '  make doctor     run the doctor with no network (exit 1 on errors)\n\n'
	@printf '  VAULT=%s\n' '$(VAULT)'
	@printf '  PORT=%s (project %s)\n\n' '$(PORT)' '$(PROJECT)'
	@printf '  Examples:\n'
	@printf '    make start VAULT=$(HOME)/notes/work PORT=8080\n'
	@printf '    make start VAULT=$(HOME)/notes/home PORT=8081\n'
	@printf '    make instances\n'
	@printf '    make index VAULT=$(HOME)/notes/work\n\n'

build: ## Build the Docker image
	$(COMPOSE_PROJECT) build

start: build ## Build and start the server
	$(COMPOSE_ENV) $(COMPOSE_PROJECT) up -d
	@printf '\n  Doc Studio -> http://127.0.0.1:%s (project %s)\n\n' '$(PORT)' '$(PROJECT)'

stop: ## Stop the server
	$(COMPOSE_PROJECT) down

restart: stop start ## Restart the server

logs: ## Follow container logs
	$(COMPOSE_PROJECT) logs -f --tail=50

ps: ## Show container status
	$(COMPOSE_PROJECT) ps

instances: ## List every running Doc Studio instance
	@docker ps --filter "label=com.docker.compose.service=docstudio" \
		--format 'table {{.Label "com.docker.compose.project"}}\t{{.Ports}}\t{{.Status}}'

stop-all: ## Stop every Doc Studio instance from this repo
	@for project in $$(docker ps -a --filter "label=com.docker.compose.service=docstudio" \
		--format '{{.Label "com.docker.compose.project"}}' | sort -u); do \
		printf 'Stopping %s\n' "$$project"; \
		$(COMPOSE) -p "$$project" down; \
	done

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
