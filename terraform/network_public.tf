resource "azurerm_public_ip" "deploylab" {
  name                = "deploylab-public-ip"
  location            = azurerm_resource_group.deploylab.location
  resource_group_name = azurerm_resource_group.deploylab.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    project     = "DeployLab"
    environment = "demo"
    managed_by  = "terraform"
  }
}

resource "azurerm_network_interface" "deploylab" {
  name                = "deploylab-nic"
  location            = azurerm_resource_group.deploylab.location
  resource_group_name = azurerm_resource_group.deploylab.name

  ip_configuration {
    name                          = "deploylab-ip-config"
    subnet_id                     = azurerm_subnet.deploylab.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.deploylab.id
  }

  tags = {
    project     = "DeployLab"
    environment = "demo"
    managed_by  = "terraform"
  }
}