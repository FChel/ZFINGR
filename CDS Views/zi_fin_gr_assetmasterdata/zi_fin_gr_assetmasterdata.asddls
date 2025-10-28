@AbapCatalog.sqlViewName: 'ZI_FIN_ASSET_MD'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Asset master data lookup'
@Metadata.ignorePropagatedAnnotations: true
@VDM.viewType: #COMPOSITE
@ObjectModel.usageType.dataClass: #MASTER
@ObjectModel.usageType.serviceQuality: #B


define view ZI_FIN_GR_ASSETMASTERDATA
  as select from anla
    inner join   anlz on  anlz.bukrs = anla.bukrs
                      and anlz.anln1 = anla.anln1
                      and anlz.anln2 = anla.anln2
    left outer join anlh on  anlh.bukrs = anla.bukrs
                         and anlh.anln1 = anla.anln1
{
  key anla.bukrs    as CompanyCode,
  key anla.anln1    as AssetNumber,
  key anla.anln2    as SubNumber,
      
      anla.anlkl    as AssetClass,
      anla.invzu    as InventoryNote,
      anla.invnr    as InventoryNumber,
      anla.sernr    as SerialNumber,
      anlh.anlhtxt  as AssetDescription,
      
      anlz.kostl    as CostCenter,
      anlz.stort    as Location,
      anlz.raumn    as Room,
      anlz.kfzkz    as LicensePlateNumber,
      anlz.bdatu    as ValidFrom,
      anlz.adatu    as ValidTo,
      
      -- For current date filtering
      case when anlz.bdatu >= $session.system_date 
           and anlz.adatu <= $session.system_date
           then 'X'
           else ''
      end as IsCurrentlyValid
}
