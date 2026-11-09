variable "resource_group_name" {
  description = "Name of the Azure resource group for DeployLab"
  type        = string
  default     = "deploylab-rg"
}

variable "location" {
  description = "Azure region where DeployLab will be deployed"
  type        = string
  default     = "westcentralus"
}

variable "vm_size" {
  description = "Azure VM size for the DeployLab server"
  type        = string
  default     = "Standard_B2ats_v2"
}

variable "admin_username" {
  description = "Linux administrator username for the DeployLab VM"
  type        = string
  default     = "azureuser"
}

variable "admin_source_ip" {
  description = "CIDR allowed to access the VM over SSH"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key used to access the DeployLab VM"
  type        = string
  sensitive   = true
}

variable "os_publisher" {
  description = "Azure VM image publisher"
  type        = string
  default     = "Canonical"
}

variable "os_offer" {
  description = "Azure VM image offer"
  type        = string
  default     = "ubuntu-24_04-lts"
}

variable "os_sku" {
  description = "Azure VM image SKU"
  type        = string
  default     = "server"
}

variable "os_version" {
  description = "Azure VM image version"
  type        = string
  default     = "latest"
}

variable "os_disk_storage_type" {
  description = "Azure OS disk storage type"
  type        = string
  default     = "Standard_LRS"
}

variable "os_disk_size_gb" {
  description = "Azure OS disk size in GB"
  type        = number
  default     = 30
}
