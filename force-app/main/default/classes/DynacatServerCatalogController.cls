/*
 * Controller class for the dynacatServerCatalog LWC, which is a "server-side" version of the catalog renderer.
 * With this version, all the filtering and pagination of target records is done in APEX.  It should be much more
 * scalable than the original dynacatCatalog LWC, particularly if support enable indexing for the fields being
 * filtered, but isn't quite as snappy as the client-version.  There's also a slight purposeful delay to help ensure
 * messages are received in the right order.
 *
 * Only a very simple layout for the records is included in this sample, the intention is that you would extend the
 * LWC and the controller to retrieve relevant fields from the target object and lay them out as you like. For a
 * more configurable option, start with the dynacatTileWall LWC instead.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class DynacatServerCatalogController {

    @AuraEnabled(cacheable=true)
    public static String getDefaultRecords(String recordTypeNames, String lookupFieldName, String isActiveFieldName, String deployment, Integer limitResults, String orderBy) {

        Dynacat_Deployment__c dd = [SELECT Id, Name, Object_API_Name__c FROM Dynacat_Deployment__c WHERE Name=:deployment];
		String objectApiName = dd.Object_API_Name__c;
        
        Set<String> objectNames = new Set<String>();
        objectNames.add(objectApiName);
        
        List<Dynacat_Filter__c> filterConfigs = [SELECT Id,
                                                 		Filter__c,
                                                  		Object_API_Name__c,
                                                  		Order__c,
                                                 		Type__c,
                                                 		Display_Type__c
                                                   FROM Dynacat_Filter__c
                                                  WHERE Deployment_Id__c = :dd.Id
                                               ORDER BY Order__c ASC];

        Boolean useFields = false;
        String nameField = [SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = :objectApiName AND IsNameField = TRUE].QualifiedApiName;
        Set<String> fields = new Set<String>{'Id',nameField};

        for(Dynacat_Filter__c c : filterConfigs) {
            if(c.Type__c=='Field') {
                useFields = true;
                // Add the field name to the Set of fields to be retrieved in the query
                fields.add(c.Filter__c);
            }
        }
        
        // Build Minimal Where Clauses based on whether there's an IsActive field specified, or particular Record Type/s
        List<String> whereClauseList = new List<String>(); 
		// IsActive field Where Clause
        if(isActiveFieldName != null && isActiveFieldName != '') {
            fields.add(isActiveFieldName);
            whereClauseList.add(isActiveFieldName+' = TRUE');
        }
        // RecordType/s Where Clause
        if(recordTypeNames != null && recordTypeNames != '') {
            List<String> recordTypesList = recordTypeNames.split(',');
            String w = 'RecordType.DeveloperName IN (';
            for(Integer i=0; i<recordTypesList.size(); i++) {
                if(i>0) w += ',';
                w += '\''+recordTypesList[i].trim()+'\'';
            }
            w += ')';
            whereClauseList.add(w);
        }
        	
        String selectClause = 'SELECT ' + String.join(new List<String>(fields),', ');
        String fromClause = ' FROM ' + objectApiName;
        String whereClause = (whereClauseList.size() > 0) ? ' WHERE ' + String.join(whereClauseList, ' AND ') : '';
        String orderByClause = (orderBy != null && orderBy != '') ? ' ORDER BY ' + orderBy : '';
        String limitClause = (limitResults != null && limitResults > 0) ? ' LIMIT ' + limitResults : ''; 
        
        Integer count = Database.countQuery('SELECT COUNT() ' + fromClause + whereClause);
        String soqlRecordsQuery = selectClause + fromClause + whereClause + orderByClause + limitClause; 
        System.debug('Soql Query: '+soqlRecordsQuery);
        List<SObject> records = Database.query(soqlRecordsQuery);

        List<Record> recs = new List<Record>();
        
        for(SObject rec : records) {
            Record r = new Record();
            r.id = (String)rec.get('Id');
            r.name = (String)rec.get(nameField);
            r.record = rec;
            recs.add(r);
        }
        
        SOQLElement soql = new SOQLElement();
        soql.selectClause = selectClause;
        soql.fromClause = fromClause;
        soql.whereClause = whereClause;
        soql.filteredWhereClause = whereClause;
        soql.orderByClause = orderByClause;
        soql.limitClause = limitClause;
        
        CatalogResponse resp = new CatalogResponse();
        resp.records = recs;
        resp.objectApiName = objectApiName;
        resp.count = count;
        resp.soql = soql;
        
        resp.config.put('nameField', nameField);
        
        String jsonResponse = JSON.serialize(resp, true);
        return jsonResponse;

    }
    
    
    @AuraEnabled(cacheable=true)
    public static String getFilteredRecords(String soqlStr, String filtersStr, String configStr) {

        SOQLElement soql = (SOQLElement) JSON.deserialize(soqlStr, SOQLElement.class);
        Map<String, Filter> filtersMap = (Map<String, Filter>) JSON.deserialize(filtersStr, Map<String, Filter>.class);
        Map<String, String> configMap = (Map<String, String>) JSON.deserialize(configStr, Map<String, String>.class);

        List<Filter> attributes = new List<Filter>();
        List<Filter> picklists = new List<Filter>();
        List<Filter> booleans = new List<Filter>();
        List<Filter> ranges = new List<Filter>();
        List<Filter> dates = new List<Filter>();
        
        for(String filterKey : filtersMap.keyset()) {
            Filter filter = filtersMap.get(filterKey);
            if(filter.type == 'attribute') {
                attributes.add(filter);
            } else if(new String[]{'PICKLIST','MULTIPICKLIST'}.contains(filter.type)) {
				picklists.add(filter);                
            } else if(filter.type == 'BOOLEAN') {
                booleans.add(filter);
            } else if(new String[]{'DOUBLE','INTEGER','CURRENCY','PERCENT'}.contains(filter.type)) {
                ranges.add(filter);
            } else if(new String[]{'DATE','DATETIME'}.contains(filter.type)) {
                dates.add(filter);
            }           
        }
        
        List<String> filteredWhereClauseList = new List<String>();
        
        // Picklists & Multipicklists
        if(picklists.size() > 0) {
            for(Filter f : picklists) {
                if(f.values != null && f.values.size() > 0) {
                    String w = f.name;
                    w += (f.type == 'PICKLIST') ? ' IN (' : ' INCLUDES (';
                    for(Integer i=0; i<f.values.size(); i++) {
    					if(i>0) w += ',';
                    	w += '\''+f.values[i]+'\'';
					}
					w +=')';
                    filteredWhereClauseList.add(w);
                }
            }            
        }
        
        // Boolean
        if(booleans.size() > 0) {
            for(Filter f : booleans) {
                if(f.values != null && f.values.size() > 0) {
                    String w = f.name + ' IN (' + String.join(f.values, ',') + ')';
                    filteredWhereClauseList.add(w);
                }
            }
        }
        
        // Ranges
        if(ranges.size() > 0) {
            for(Filter f : ranges) {
                if(f.range != null) {
                    if(f.range.start != null) {
                        filteredWhereClauseList.add(f.name + ' >= ' + f.range.start);
                    }
                    if(f.range.finish != null) {
                        filteredWhereClauseList.add(f.name + ' <= ' + f.range.finish);
                    }
                }
            }
        }
        
        // Date Range && DateTime
        if(dates.size() > 0) {
            for(Filter f : dates) {
                if(f.dateRange != null) {
                    if(f.dateRange.start != null) {
                        f.dateRange.start += (f.type=='DATETIME') ? 'T00:00:00Z' : '';
                        filteredWhereClauseList.add(f.name + ' >= ' + f.dateRange.start);
                    }
                    if(f.dateRange.finish != null) {
                        f.dateRange.finish += (f.type=='DATETIME') ? 'T00:00:00Z' : '';
                        filteredWhereClauseList.add(f.name + ' <= ' + f.dateRange.finish);
                    }
                }
            }
        }
        
        // Build Attribute Joined Queries and add them to the Where Clause List
        List<String> attWhereClauseList = new List<String>();
        if(attributes.size() > 0) {
            for(Filter f : attributes) {
                System.debug('Attribute Filter: '+f.name + ', Values: '+f.values);
                if(f.values != null && f.values.size() > 0) {
                    String w = 'Id IN (SELECT ' + f.lookupFieldName + ' FROM Dynacat_Record_Attribute__c WHERE Attribute_UID__c IN (';
                    for(Integer i=0; i<f.values.size(); i++) {
    					if(i>0) w += ',';
                    	w += '\''+f.values[i]+'\'';
					}
					w +='))';
                    filteredWhereClauseList.add(w);
                }
            }
        }
        
        String filteredWhereClause = (soql.whereClause != null && soql.whereClause != '') ? soql.whereClause : '';
        if(filteredWhereClauseList.size() > 0) {
            filteredWhereClause += (filteredWhereClause != '') ? ' AND ' : ' WHERE ';
            filteredWhereClause += String.join(filteredWhereClauseList, ' AND ');
        }
        
        Integer count = Database.countQuery('SELECT COUNT() ' + soql.fromClause + filteredWhereClause);
        String soqlRecordsQuery = soql.selectClause + soql.fromClause + filteredWhereClause + soql.orderByClause + soql.limitClause;
        System.debug('Filtered Soql Query: '+soqlRecordsQuery);
        List<SObject> records = Database.query(soqlRecordsQuery);
        
        List<Record> recs = new List<Record>();
        
        for(SObject rec : records) {
            Record r = new Record();
            r.id = (String)rec.get('Id');
            r.name = (String)rec.get(configMap.get('nameField'));
            r.record = rec;
            recs.add(r);
        }
                
        CatalogResponse resp = new CatalogResponse();
        resp.records = recs;
        resp.count = count;
        soql.filteredWhereClause = filteredWhereClause;
        resp.soql = soql;
        
        String jsonResponse = JSON.serialize(resp, true);
        return jsonResponse;

    }
    
    
    @AuraEnabled(cacheable=true)
    public static String getNextRecords(String soqlStr, Integer offset, String configStr) {
        System.debug('Next!');
        SOQLElement soql = (SOQLElement) JSON.deserialize(soqlStr, SOQLElement.class);
        Map<String, String> configMap = (Map<String, String>) JSON.deserialize(configStr, Map<String, String>.class);
		System.debug(configMap.get('nameField'));
        Integer count = Database.countQuery('SELECT COUNT() ' + soql.fromClause + soql.filteredWhereClause);
        String soqlRecordsQuery = soql.selectClause + soql.fromClause + soql.filteredWhereClause + soql.orderByClause + soql.limitClause + ' OFFSET ' + offset;
        System.debug('Next Soql Query: '+soqlRecordsQuery);
        List<SObject> records = Database.query(soqlRecordsQuery);
        
        List<Record> recs = new List<Record>();
        
        for(SObject rec : records) {
            Record r = new Record();
            r.id = (String)rec.get('Id');
            r.name = (String)rec.get(configMap.get('nameField'));
            r.record = rec;
            recs.add(r);
        }
        
        CatalogResponse resp = new CatalogResponse();
        resp.records = recs;
        resp.count = count;
        
        String jsonResponse = JSON.serialize(resp, true);
        return jsonResponse;
    }

    
    
    private class CatalogResponse {
        private List<Record> records;
        private Integer count;
        private String objectApiName;
        private SOQLElement soql;
        private Map<String,String> config = new Map<String,String>();
    }
    
    
    private class Record {
		private String id;
        private String name;
        private SObject record;
    }
    
    
    private class SOQLElement {
        private String selectClause;
        private String fromClause;
        private String whereClause;
        private String filteredWhereClause;
        private String orderByClause;
        private String limitClause;
    }
    
    
    private class Filter {
        private String name;
        private String filterType;
        private String type;
        private List<String> values;
        private String lookupFieldName;
        private RangeFilter range;
        private DateFilter dateRange;
        
    }
    
    private class RangeFilter {
        private Decimal start;
        private Decimal finish;
    }
    
    private class DateFilter {
        private String start;
        private String finish;
    }
}