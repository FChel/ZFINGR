@AbapCatalog.sqlViewName: 'ZI_FIN_POHEADER'
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Purchase Order Header for GR'
@VDM.viewType: #COMPOSITE

define view ZI_FIN_GR_POHEADER
  as select from ekko
    left outer join lfa1 on lfa1.lifnr = ekko.lifnr
    
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
      case when ekko.memory = ''
           then 'X'
           else ''
      end as IsComplete,
      
      case when ekko.frgrl = ''
           then 'X'
           else ''
      end as IsApproved,
      
      case when ekko.bsart = 'NB'
           then 'X'
           else ''
      end as IsStandardPO,
      
      -- All standard POs are MyFi enabled
      case when ekko.bsart = 'NB'
           then 'X'
           else ''
      end as IsMyFiEnabled,
      
      -- Associations
      _Items,
      _Vendor
}
