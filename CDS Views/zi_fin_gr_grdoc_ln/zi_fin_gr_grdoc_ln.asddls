/*----------------------------------------------------------------------*
* AUTHOR:     220977FKC                                                 *
* DATE:       17.10.2025                                                *
* WRICEFX-ID: FINX2103, Goods Recepting Application (Simple, ERP MyFi)  *
* ----------------------------------------------------------------------*
* Purpose: Goods Receipt Document Lines                                  *
* ----------------------------------------------------------------------*
* MODIFICATION HISTORY                                                  *
* UserID       Date        Transport   Description                      *
* 220977FKC    17.10.2025  S2DK940804  Initial development              *
* ---------------------------------------------------------------------*/

@AbapCatalog.sqlViewName: 'ZI_FIN_GRDOC_LN'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Goods Receipt Document Lines'
@Metadata.ignorePropagatedAnnotations: true
@VDM.viewType: #COMPOSITE
define view ZI_FIN_GR_GRDOC_LN
    as select from matdoc
    left outer join matdoc as reversal
        on  reversal.smbln = matdoc.mblnr
        and reversal.sjahr = matdoc.mjahr
        and reversal.smblp = matdoc.zeile
        and reversal.shkzg = 'H'  
{
    key matdoc.key1     as Key1,
    key matdoc.key2     as Key2,
    key matdoc.key3     as Key3,
    key matdoc.key4     as Key4,
    key matdoc.key5     as Key5,
    key matdoc.key6     as Key6, 
  
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
      matdoc.smbln      as ReferenceMaterialDocument,
      matdoc.sjahr      as ReferenceMaterialDocumentYear,
      matdoc.smblp      as ReferenceMaterialDocumentItem,
      
      reversal.mblnr    as ReversedByDocument,
      reversal.mjahr    as ReversedByDocumentYear,
      reversal.zeile    as ReversedByDocumentItem,
      
      case when reversal.mblnr is not null
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
