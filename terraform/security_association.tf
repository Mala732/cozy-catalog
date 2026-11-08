resource "azurerm_network_interface_security_group_association" "deploylab" {
  network_interface_id      = azurerm_network_interface.deploylab.id
  network_security_group_id = azurerm_network_security_group.deploylab.id
}