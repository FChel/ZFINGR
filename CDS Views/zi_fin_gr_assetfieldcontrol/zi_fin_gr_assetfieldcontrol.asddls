@AbapCatalog.sqlViewName: 'ZI_FIN_ASSTFLDCT'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Asset Field Control Settings'
@Metadata.ignorePropagatedAnnotations: true
@VDM.viewType: #BASIC

define view ZI_FIN_GR_ASSETFIELDCONTROL
  as select from anka
    inner join t082g on t082g.felei = anka.felei
{
  key anka.anlkl as AssetClass,
  key t082g.fegru as FieldGroup,
      
      anka.felei as FieldLayout,
      t082g.fnein as FieldIsOff,
      
      -- Specific field checks
      case t082g.fegru
        when '07' then t082g.fnein  -- Main Description
        when '37' then t082g.fnein  -- Note
        when '04' then t082g.fnein  -- Inventory Number
        when '75' then t082g.fnein  -- Serial Number
        when '19' then t082g.fnein  -- Room
        when '14' then t082g.fnein  -- License Plate
        else ''
      end as FieldOffFlag
}
where t082g.fegtb = 'A'
