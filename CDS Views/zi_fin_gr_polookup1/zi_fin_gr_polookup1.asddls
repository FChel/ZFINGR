@AbapCatalog.sqlViewName: 'ZI_FIN_POLOOKUP1'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Purchase Order Lookup with WBS Translate'
@VDM.viewType: #BASIC
@Metadata.ignorePropagatedAnnotations: true

define view ZI_FIN_GR_POLOOKUP1
    as select from ekko
        inner join ekkn on  ekkn.mandt = ekko.mandt
        and ekkn.ebeln = ekko.ebeln
    inner join lfa1 on  lfa1.mandt = ekko.mandt
        and lfa1.lifnr = ekko.lifnr
    inner join prps on  prps.mandt = ekkn.mandt
        and prps.pspnr = ekkn.ps_psp_pnr
{
  key ekko.ebeln        as Po_Number,
  key ekkn.ebelp        as Po_Item,
  key ekkn.zekkn        as Serial_No,
      
      ekko.aedat        as Creat_Date,
      ekko.lifnr        as Vendor,
      ekko.konnr        as Oa_Number,
      ekkn.kostl        as Costcenter,
      lfa1.name1        as Vendor_Name,
      lfa1.mcod1        as Vendor_Name_M_C,
      lfa1.stceg        as Abn,
      prps.posid        as Wbs_Element
}
