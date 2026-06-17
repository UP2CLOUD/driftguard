from __future__ import annotations
from ..parsers.terraform_diff import ResourceChange
from ..pricing import azure as pricing


_AZURE_RESOURCE_TYPES = {
    "azurerm_linux_virtual_machine",
    "azurerm_windows_virtual_machine",
    "azurerm_managed_disk",
    "azurerm_kubernetes_cluster",
    "azurerm_postgresql_flexible_server",
    "azurerm_mysql_flexible_server",
    "azurerm_storage_account",
    "azurerm_app_service_plan",
    "azurerm_nat_gateway",
}


def estimate(rc: ResourceChange) -> int:
    if rc.resource_type not in _AZURE_RESOURCE_TYPES:
        return 0
    a = rc.attributes

    if rc.resource_type in ("azurerm_linux_virtual_machine", "azurerm_windows_virtual_machine"):
        size = a.get("size", "Standard_D2s_v5")
        return pricing.vm_monthly_cents(str(size))

    if rc.resource_type == "azurerm_managed_disk":
        sku = a.get("storage_account_type", "StandardSSD_LRS")
        size = int(a.get("disk_size_gb", 32))
        return pricing.managed_disk_monthly_cents(str(sku), size)

    if rc.resource_type == "azurerm_kubernetes_cluster":
        vm_size = a.get("vm_size", "Standard_D2s_v5")
        node_count = int(a.get("node_count", 1))
        control_plane = pricing.AKS_CONTROL_PLANE_MONTHLY_CENTS
        nodes = pricing.aks_node_monthly_cents(str(vm_size), node_count)
        return control_plane + nodes

    if rc.resource_type in ("azurerm_postgresql_flexible_server", "azurerm_mysql_flexible_server"):
        sku = a.get("sku_name", "GP_Standard_D2s_v3")
        storage = int(a.get("storage_mb", 32768)) // 1024  # MB → GB
        return pricing.postgresql_flexible_monthly_cents(str(sku), storage)

    if rc.resource_type == "azurerm_storage_account":
        return 0  # usage-based

    if rc.resource_type == "azurerm_app_service_plan":
        tier = a.get("sku_name", a.get("tier", "B1"))
        return pricing.APP_SERVICE_PLAN.get(str(tier).lower(), 5840)

    if rc.resource_type == "azurerm_nat_gateway":
        return pricing.NAT_GATEWAY_MONTHLY_CENTS

    return 0
