output "public_ip_address" {
  description = "Public IP address of the DeployLab VM"
  value       = azurerm_public_ip.deploylab.ip_address
}