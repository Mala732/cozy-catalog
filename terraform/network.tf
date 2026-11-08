resource "azurerm_virtual_network" "deploylab" {
  name                = "deploylab-vnet"
  location            = azurerm_resource_group.deploylab.location
  resource_group_name = azurerm_resource_group.deploylab.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    project     = "DeployLab"
    environment = "demo"
    managed_by  = "terraform"
  }
}

resource "azurerm_subnet" "deploylab" {
  name                 = "deploylab-subnet"
  resource_group_name  = azurerm_resource_group.deploylab.name
  virtual_network_name = azurerm_virtual_network.deploylab.name
  address_prefixes     = ["10.0.1.0/24"]
}