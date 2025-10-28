@AbapCatalog.sqlViewName: 'ZI_FIN_POCOMP'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Complete Purchase Order Data for GR'
@VDM.viewType: #COMPOSITE
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType.dataClass: #TRANSACTIONAL
@ObjectModel.usageType.serviceQuality: #A
define view ZI_FIN_GR_POCOMPLETE
  as select from ZI_FIN_GR_POHEADER as Header
    left outer join ZI_FIN_GR_POITEMS as Items 
      on Items.PurchaseOrder = Header.PurchaseOrder
    left outer join ZI_FIN_GR_POASSETS as Assets
      on Assets.PurchaseOrder = Header.PurchaseOrder    
    association [0..*] to ZI_FIN_GR_POITEMS as _Items 
      on _Items.PurchaseOrder = Header.PurchaseOrder
    association [0..*] to ZI_FIN_GR_POASSETS as _Assets
      on _Assets.PurchaseOrder = Header.PurchaseOrder
    association [0..*] to ZI_FIN_GR_POHISTORY as _History
      on _History.PurchaseOrder = Header.PurchaseOrder
{
  key Header.PurchaseOrder,
      
      Header.CompanyCode,
      Header.DocumentType,
      Header.Vendor,
      Header.VendorName,
      Header.Currency,
      Header.DocumentDate,
      Header.CreatedBy,
      
      -- Status
      Header.IsComplete,
      Header.IsApproved,
      Header.IsStandardPO,
      Header.IsMyFiEnabled,
      
      -- Calculated total value
      @Semantics.amount.currencyCode: 'Currency'
      sum(case when Items.DeletionIndicator != 'L' 
               then Items.EffectiveValue 
               else cast(0 as abap.curr(15,2))
          end) as TotalValue,
          
      -- Asset count
      count(distinct Assets.AssetNumber) as AssetCount,
                      
      -- Available items count
      sum(case when Items.AvailableForGR = 'X' 
               then 1 
               else 0 
          end) as AvailableItemsCount,          
          
      -- Associations
      _Items,
      _Assets,
      _History
}
group by Header.PurchaseOrder, Header.CompanyCode, Header.DocumentType,
         Header.Vendor, Header.VendorName, Header.Currency,
         Header.DocumentDate, Header.CreatedBy, Header.IsComplete,
         Header.IsApproved, Header.IsStandardPO, Header.IsMyFiEnabled
