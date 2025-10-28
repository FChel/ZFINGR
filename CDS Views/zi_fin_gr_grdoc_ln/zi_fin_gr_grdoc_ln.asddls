@AbapCatalog.sqlViewName: 'ZI_FIN_GRDOC_LN'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Goods Receipt Document Lines'
@Metadata.ignorePropagatedAnnotations: true
@VDM.viewType: #COMPOSITE
define view ZI_FIN_GR_GRDOC_LN
  as select from matdoc
{
  key key1              as Key1,
  key key2              as Key2,
  key key3              as Key3,
  key key4              as Key4,
  key key5              as Key5,
  key key6              as Key6, 
  
      matdoc.mblnr      as MaterialDocument,
      matdoc.mjahr      as DocumentYear,
      matdoc.zeile      as DocumentItem,
      
      matdoc.blart      as DocumentType,
      matdoc.bldat      as DocumentDate,
      matdoc.budat      as PostingDate,
      matdoc.usnam      as UserName,
      matdoc.xblnr      as ReferenceDocument,
      matdoc.bktxt      as HeaderText,
      
      matdoc.bwart      as MovementType,
      matdoc.shkzg      as DebitCreditIndicator,
      matdoc.matnr      as Material,
      matdoc.werks      as Plant,
      matdoc.lgort      as StorageLocation,
      
      matdoc.ebeln      as PurchaseOrder,
      matdoc.ebelp      as PurchaseOrderItem,
      
      @Semantics.quantity.unitOfMeasure: 'EntryUnit'
      matdoc.menge      as Quantity,
      matdoc.meins      as EntryUnit,
      
      @Semantics.quantity.unitOfMeasure: 'OrderUnit'
      matdoc.bpmng      as QuantityInOrderUnit,
      matdoc.bprme      as OrderUnit,
      
      @Semantics.amount.currencyCode: 'Currency'
      matdoc.dmbtr      as AmountInLocalCurrency,
      matdoc.waers      as Currency,
      
      -- Reversal information
      matdoc.smbln      as ReversalDocument,
      matdoc.sjahr      as ReversalYear,
      matdoc.smblp      as ReversalItem,
      
      case when matdoc.smbln != ''
           then 'X'
           else ''
      end as IsReversed,
            
      -- Adjusted quantity (negative for cancellations)
      @Semantics.quantity.unitOfMeasure: 'EntryUnit'      
      case when matdoc.shkzg = 'H'
          then matdoc.menge * -1
          else matdoc.menge
      end as AdjustedQuantity
      
}
