/*----------------------------------------------------------------------*
* AUTHOR:     220977FKC                                                 *
* DATE:       17.10.2025                                                *
* WRICEFX-ID: FINX2103, Goods Recepting Application (Simple, ERP MyFi)  *
* ----------------------------------------------------------------------*
* Purpose: PO Goods Receipt Quantities                                  *
* ----------------------------------------------------------------------*
* MODIFICATION HISTORY                                                  *
* UserID       Date        Transport   Description                      *
* 220977FKC    17.10.2025  S2DK940804  Initial development              *
* ---------------------------------------------------------------------*/
@AbapCatalog.sqlViewName: 'ZI_FIN_PORECQTY'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'PO Goods Receipt Quantities'
@Metadata.ignorePropagatedAnnotations: true
define view ZI_FIN_GR_PORECEIVEDQTY
    as select from ekbe
        inner join ekpo on ekbe.ebeln = ekpo.ebeln 
            and ekbe.ebelp = ekpo.ebelp
{
  key ekbe.ebeln as PurchaseOrder,
  key ekbe.ebelp as PurchaseOrderItem,
  @Semantics.quantity.unitOfMeasure: 'OrderUnit'
  sum(ekbe.menge) as DeliveredQuantity,
  ekpo.meins as OrderUnit  -- Using unit from EKPO for consistency
}
where ekbe.vgabe = '1' -- Goods Receipt
group by ekbe.ebeln, ekbe.ebelp, ekpo.meins
