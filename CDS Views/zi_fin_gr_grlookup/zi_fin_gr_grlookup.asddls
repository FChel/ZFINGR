/*----------------------------------------------------------------------*
* AUTHOR:     220977FKC                                                 *
* DATE:       17.10.2025                                                *
* WRICEFX-ID: FINX2103, Goods Recepting Application (Simple, ERP MyFi)  *
* ----------------------------------------------------------------------*
* Purpose: Goods Receipt Lookup (for Search Help)                       *
* ----------------------------------------------------------------------*
* MODIFICATION HISTORY                                                  *
* UserID       Date        Transport   Description                      *
* 220977FKC    17.10.2025  S2DK940804  Initial development              *
* ---------------------------------------------------------------------*/

@AbapCatalog.sqlViewName: 'ZI_FIN_GRLOOKUP'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Goods Receipt Lookup (for Search Help)'
@Metadata.ignorePropagatedAnnotations: true
define view ZI_FIN_GR_GRLOOKUP
    as select from matdoc
    left outer join lfa1 on matdoc.lifnr = lfa1.lifnr
{
  key matdoc.mblnr as mat_doc,
  key matdoc.mjahr as doc_year,
  key matdoc.zeile as matdoc_item,
      
      // Header fields
      matdoc.bldat as doc_date,
      matdoc.usnam as username,
      matdoc.xblnr as ref_doc_no,
      matdoc.bktxt as header_txt,
      
      // Item fields
      matdoc.lifnr as vendor,
      matdoc.shkzg as deb_cre_ind,
      matdoc.erfmg as entry_qnt,
      matdoc.erfme as entry_uom,
      matdoc.ebeln as po_number,
      matdoc.ebelp as po_item,
      
      // Vendor info
      lfa1.name1 as vendor_name,
      lfa1.mcod1 as vendor_name_m_c
}
where matdoc.record_type = 'MDOC'   
  and matdoc.blart = 'WE'      // Only GR document type
