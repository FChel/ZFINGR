@AbapCatalog.sqlViewName: 'ZI_FIN_POASSETS'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'PO Asset Assignments'
@Metadata.ignorePropagatedAnnotations: true
@VDM.viewType: #BASIC

define view ZI_FIN_GR_POASSETS
  as select from ekkn
    inner join ekko on ekkn.ebeln = ekko.ebeln
{
  key ekkn.ebeln as PurchaseOrder,
  key ekkn.ebelp as PurchaseOrderItem,
  key ekkn.zekkn as AccountAssignmentNumber,
      
      ekkn.anln1 as AssetNumber,
      ekkn.anln2 as SubNumber,
      ekko.bukrs as CompanyCode,
      ekkn.kokrs as ControllingArea,
      ekkn.kostl as CostCenter,
      ekkn.aufnr as InternalOrder,
      ekkn.ps_psp_pnr as WBSElement
}
where anln1 != ''
