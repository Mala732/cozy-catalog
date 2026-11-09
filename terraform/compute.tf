resource "azurerm_linux_virtual_machine" "deploylab" {
  name                = "deploylab-vm"
  location            = azurerm_resource_group.deploylab.location
  resource_group_name = azurerm_resource_group.deploylab.name
  size                = var.vm_size
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.deploylab.id
  ]

  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    name                 = "deploylab-osdisk"
    caching              = "ReadWrite"
    storage_account_type = var.os_disk_storage_type
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    publisher = var.os_publisher
    offer     = var.os_offer
    sku       = var.os_sku
    version   = var.os_version
  }

  tags = {
    project     = "DeployLab"
    environment = "demo"
    managed_by  = "terraform"
  }
}
