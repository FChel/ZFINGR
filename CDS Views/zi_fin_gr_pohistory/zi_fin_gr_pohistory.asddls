/*----------------------------------------------------------------------*
* AUTHOR:     220977FKC                                                 *
* DATE:       17.10.2025                                                *
* WRICEFX-ID: FINX2103, Goods Recepting Application (Simple, ERP MyFi)  *
* ----------------------------------------------------------------------*
* Purpose: Purchase Order History for GR                                *
* ----------------------------------------------------------------------*
* MODIFICATION HISTORY                                                  *
* UserID       Date        Transport   Description                      *
* 220977FKC    17.10.2025  S2DK940804  Initial development              *
* ---------------------------------------------------------------------*/

@AbapCatalog.sqlViewName: 'ZI_FIN_POHISTORY'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Purchase Order History'
@Metadata.ignorePropagatedAnnotations: true
define view ZI_FIN_GR_POHISTORY
    as select from ekbe
        inner join ekpo on ekbe.ebeln = ekpo.ebeln 
                       and ekbe.ebelp = ekpo.ebelp  
{
  key ekbe.ebeln           as PurchaseOrder,
  key ekbe.ebelp           as PurchaseOrderItem,
  key ekbe.zekkn           as AccountAssignmentNumber,
  key ekbe.vgabe           as TransactionType,
  key ekbe.gjahr           as FiscalYear,
  key ekbe.belnr           as DocumentNumber,
  key ekbe.buzei           as DocumentItem,
      
      ekbe.bewtp           as POHistoryCategory,
      ekbe.bwart           as MovementType,
      ekbe.budat           as PostingDate,
      
      @Semantics.quantity.unitOfMeasure: 'Unit'
      ekbe.menge           as Quantity,
      ekpo.meins           as Unit,
      
      @Semantics.quantity.unitOfMeasure: 'OrderUnit'  
      ekbe.bpmng           as QuantityInOrderUnit,
      ekpo.bprme           as OrderUnit,
      
      @Semantics.amount.currencyCode: 'Currency'
      ekbe.dmbtr           as AmountInLocalCurrency,
      ekbe.waers           as Currency,
      
      @Semantics.amount.currencyCode: 'Currency'
      ekbe.wrbtr           as AmountInDocumentCurrency,
      
      ekbe.shkzg           as DebitCreditIndicator,
      ekbe.xblnr           as ReferenceDocument,
      
      -- Material document reference
      ekbe.lfgja           as MaterialDocumentYear,
      ekbe.lfbnr           as MaterialDocument,
      ekbe.lfpos           as MaterialDocumentItem,
      
      -- Aggregated quantities by type
      case ekbe.vgabe
        when '1' then ekpo.menge  -- Goods Receipt
        else 0
      end as GoodsReceiptQuantity,
      
      case ekbe.vgabe
        when '2' then ekpo.menge  -- Invoice Receipt
        else 0
      end as InvoiceQuantity
}
