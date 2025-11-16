/*----------------------------------------------------------------------*
* AUTHOR:     220977FKC                                                 *
* DATE:       17.10.2025                                                *
* WRICEFX-ID: FINX2103, Goods Recepting Application (Simple, ERP MyFi)  *
* ----------------------------------------------------------------------*
* Purpose: Purchase Order Header for GR                                 *
* ----------------------------------------------------------------------*
* MODIFICATION HISTORY                                                  *
* UserID       Date        Transport   Description                      *
* 220977FKC    17.10.2025  S2DK940804  Initial development              *
* ---------------------------------------------------------------------*/
@AbapCatalog.sqlViewName: 'ZI_FIN_POHEADER'
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Purchase Order Header for GR'
@VDM.viewType: #COMPOSITE

define view ZI_FIN_GR_POHEADER
  as select from ekko
    left outer join lfa1 on lfa1.lifnr = ekko.lifnr
    
    -- Join for currency restriction check
    left outer join tvarvc as currency_restrict
      on  currency_restrict.name = 'Z_ZFINGR_RESTRICT_CURRENCY_AUD'
      and currency_restrict.type = 'P'
      and currency_restrict.low  = 'X'    
    
    -- Define association to items
    association [0..*] to ekpo as _Items
        on _Items.ebeln = ekko.ebeln

    -- Define association to vendor
    association [0..1] to lfa1 as _Vendor
        on _Vendor.lifnr = ekko.lifnr
        
{
  key ekko.ebeln      as PurchaseOrder,
      
      ekko.bukrs      as CompanyCode,
      ekko.bsart      as DocumentType,
      ekko.bstyp      as DocumentCategory,
      ekko.lifnr      as Vendor,
      lfa1.name1      as VendorName,
      ekko.waers      as Currency,
      ekko.bedat      as DocumentDate,
      ekko.aedat      as CreatedOn,
      ekko.ernam      as CreatedBy,
      
      -- Status flags
      ekko.memory     as OnHold,
      ekko.frgrl      as ReleaseNotComplete,
      ekko.frgke      as ReleaseIndicator,
      ekko.frgzu      as ReleaseStatus,
      
      -- Derived fields
      case when ekko.memory is initial
           then 'X'
           else ''
      end as IsComplete,
      
      case when ekko.frgrl is initial
           then 'X'
           else ''
      end as IsApproved,
      
      case when ekko.bsart = 'NB' or ekko.bsart = 'ZSPO'
           then 'X'
           else ''
      end as IsStandardPO,
      
      -- Currency restriction: AUD only (if restriction is active)
      case when ekko.waers <> 'AUD'
           and currency_restrict.name is not null
           then 'X'
           else ''
      end as IsExcluded,      
            
      -- Associations
      _Items,
      _Vendor
}
