@AbapCatalog.sqlViewName: 'ZI_FIN_POITEMS'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Purchase Order Items for GR'
@Metadata.ignorePropagatedAnnotations: true
@AbapCatalog.dataMaintenance: #RESTRICTED
@VDM.viewType: #COMPOSITE

define view ZI_FIN_GR_POITEMS
  as select from ekpo
    inner join ekko on ekko.ebeln = ekpo.ebeln
    left outer join ZI_FIN_GR_PORECEIVEDQTY as gr 
      on  gr.PurchaseOrder = ekpo.ebeln
      and gr.PurchaseOrderItem = ekpo.ebelp
{
  key ekpo.ebeln      as PurchaseOrder,
  key ekpo.ebelp      as PurchaseOrderItem,
      
      ekpo.txz01      as ItemDescription,
      ekpo.matnr      as Material,
      ekpo.werks      as Plant,
      ekpo.lgort      as StorageLocation,
      ekpo.matkl      as MaterialGroup,
      
      @Semantics.quantity.unitOfMeasure: 'OrderUnit'
      ekpo.menge      as OrderQuantity,
      ekpo.meins      as OrderUnit,
      
      @Semantics.amount.currencyCode: 'Currency'
      ekpo.netpr      as NetPrice,
      ekpo.peinh      as PriceUnit,
      @Semantics.amount.currencyCode: 'Currency'
      ekpo.netwr      as NetValue,
      @Semantics.amount.currencyCode: 'Currency'
      ekpo.effwr      as EffectiveValue,
      ekko.waers      as Currency,  -- Currency from EKKO header
      
      ekpo.mwskz      as TaxCode,
      ekpo.webre      as GRBasedIV,
      ekpo.knttp      as AccountAssignmentCategory,
      ekpo.loekz      as DeletionIndicator,
      ekpo.elikz      as DeliveryCompleted,
      ekpo.erekz      as FinalInvoice,
      ekpo.repos      as InvoiceReceipt,
      
      -- GR quantities
      @Semantics.quantity.unitOfMeasure: 'OrderUnit'
      coalesce(gr.DeliveredQuantity, cast(0 as abap.dec(13,3))) as DeliveredQuantity,
      
      @Semantics.quantity.unitOfMeasure: 'OrderUnit'
      ekpo.menge - coalesce(gr.DeliveredQuantity, cast(0 as abap.dec(13,3))) as OpenQuantity,
      
      -- Flags for GR processing
      case when ekpo.repos = ''  -- GR indicator set
           and ekpo.elikz = ''  -- Not delivery completed
           and ekpo.loekz = ''  -- Not deleted
           and ekpo.erekz = ''  -- Not final invoiced
           and ekpo.knttp != 'X' -- Not unknown account assignment
           then 'X'
           else ''
      end as AvailableForGR,
      
      case when ekpo.knttp = 'A'
           then 'X'
           else ''
      end as IsAssetItem
}
