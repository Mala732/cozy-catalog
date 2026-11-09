terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "local" {}
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
}

resource "azurerm_resource_group" "deploylab" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    project     = "DeployLab"
    environment = "demo"
    managed_by  = "terraform"
  }
}