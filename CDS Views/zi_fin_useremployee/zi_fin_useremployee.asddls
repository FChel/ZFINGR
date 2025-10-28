@AbapCatalog.sqlViewName: 'ZI_FIN_USEREMP'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'User and Employee Data'
@Metadata.ignorePropagatedAnnotations: true
define view ZI_FIN_USEREMPLOYEE
    as select from usr21
        left outer join adrp on adrp.persnumber = usr21.persnumber
        left outer join pa0105 on pa0105.usrid = usr21.bname
                               and pa0105.subty = '0001'
                               and pa0105.begda <= $session.system_date
                               and pa0105.endda >= $session.system_date
        left outer join pa0001 on pa0001.pernr = pa0105.pernr
                               and pa0001.begda <= $session.system_date
                               and pa0001.endda >= $session.system_date
        left outer join pa0002 on pa0002.pernr = pa0105.pernr
                               and pa0002.begda <= $session.system_date
                               and pa0002.endda >= $session.system_date
{
    key usr21.bname     as UserName,
      
    -- User master data
    adrp.name_text  as FullNameFromUser,
    adrp.name_first as FirstName,
    adrp.name_last  as LastName,
  
    -- Employee data
    pa0105.pernr    as EmployeeNumber,
    pa0001.bukrs    as CompanyCode,
    pa0001.orgeh    as OrganizationalUnit,
    pa0001.kostl    as CostCenter,
  
    -- Employee name details
    pa0002.nachn    as EmployeeLastName,
    pa0002.vorna    as EmployeeFirstName,
    pa0002.titel    as Title,
  
    -- Combined name
    concat_with_space(
        concat_with_space(pa0002.titel, pa0002.vorna, 1),
        pa0002.nachn, 1
    ) as FullNameFromHR,
  
    -- Use HR name if available, otherwise user master
    case when pa0002.pernr is not null
        then concat_with_space(
            concat_with_space(pa0002.titel, pa0002.vorna, 1),
                pa0002.nachn, 1
            )
        else adrp.name_text
    end as DisplayName
}
