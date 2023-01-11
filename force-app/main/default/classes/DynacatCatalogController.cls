/*
 * Controller class for the dynacatCatalog LWC, which is the original client-based catalog renderer.
 * With this version, ALL records for the target object will be downloaded to the browser, and filtering 
 * and pagination is all handled by the LWC. It's really fast because of this, but will run into scalability
 * challenges with larger record sets.
 *
 * Only a very simple layout for the records is included in this sample, the intention is that you would extend the
 * LWC and the controller to retrieve relevant fields from the target object and lay them out as you like. For a
 * more configurable option, start with the dynacatTileWall LWC instead.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class DynacatCatalogController {

    @AuraEnabled(cacheable=true)
    public static String getActiveRecords(String recordTypeNames, String lookupFieldName, String isActiveFieldName, String deployment, String orderBy) {

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

        System.debug('Configs Size: '+filterConfigs.size());

        Set<String> fields = new Set<String>{'Id','Name'};
        Set<String> booleanFields = new Set<String>();
        Boolean useAttributes = false;
        Boolean useFields = false;
        Boolean hasBooleanFields = false;
        
        for(Dynacat_Filter__c c : filterConfigs) {
            if(c.Type__c=='Attribute') useAttributes = true;
            if(c.Type__c=='Field') {
                useFields = true;
                if(c.Object_API_Name__c != null) objectNames.add(c.Object_API_Name__c);
                fields.add(c.Filter__c);
            }
        }
        
        Boolean showWhereClause = false;
        List<String> whereClauses = new List<String>(); 
        Set<String> recordTypesSet = new Set<String>();

        if(isActiveFieldName != null && IsActiveFieldName != '') {
            fields.add(isActiveFieldName);
            showWhereClause = true;
            whereClauses.add(isActiveFieldName+' = TRUE');
        }
        
        if(recordTypeNames != null && recordTypeNames != '') {
            showWhereClause = true;
            List<String> recordTypesList = recordTypeNames.split(',');
            for(String recordType : recordTypesList) {
                recordTypesSet.add(recordType.trim());
            }
            whereClauses.add('RecordType.DeveloperName IN :recordTypesSet');
        }
		
        String whereClause = (showWhereClause) ? ' WHERE ' + String.join(whereClauses, ' AND ') : '';

        String orderByClause = (orderBy != null && orderBy != '') ? ' ORDER BY ' + orderBy : '';
        
        String soqlRecordsQuery = 'SELECT ' + String.join(new List<String>(fields),',') + ' FROM ' + objectApiName + whereClause + orderByClause;
        System.debug('Soql Query: '+soqlRecordsQuery);
        List<SObject> records = Database.query(soqlRecordsQuery);

        List<Dynacat_Record_Attribute__c> recordAttributes = [SELECT Id, Record_UID__c, Attribute_UID__c FROM Dynacat_Record_Attribute__c];
        
        Map<String, List<String>> recAttr = new Map<String, List<String>>();
        for(Dynacat_Record_Attribute__c ra : recordAttributes) {
            if(!recAttr.keyset().contains(ra.Attribute_UID__c)) {
                recAttr.put(ra.Attribute_UID__c, new List<String>{ra.Record_UID__c});
            } else {
                List<String> currentRecs = recAttr.get(ra.Attribute_UID__c);
                currentRecs.add(ra.Record_UID__c);
                recAttr.put(ra.Attribute_UID__c, currentRecs);
            }
        }
        System.debug(recAttr);
        
        List<Record> recs = new List<Record>();
        
        for(SObject rec : records) {
            Record r = new Record();
            r.id = (String)rec.get('Id');
            r.name = (String)rec.get('Name');
            r.uid = rec.Id;
            r.record = rec;
            recs.add(r);
        }
        System.debug(recs);
        
        CatalogResponse resp = new CatalogResponse();
        resp.records = recs;
        resp.objectApiName = objectApiName;
        resp.recAttr = recAttr;
        
        String jsonResponse = JSON.serialize(resp, true);
        System.debug(jsonResponse);
        return jsonResponse;
    }
    
    private class CatalogResponse {
        private List<Record> records;
        private String objectApiName;
        private Map<String, List<String>> recAttr;
    }
    
    private class Record {
		private String id;
        private String name;
        private String uid;
        private SObject record;
    }
}