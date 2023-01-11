/*
 * Controller for the objectFieldPicker LWC which is a Flow screen component that
 * enables you to select an SObject and Field, including navigation of lookup / master-detail fields.
 * It outputs the field path (eg. Account.Owner.Name) and the object the final field is on (in that example
 * the User object). If the field is a picklist field then the valid values are also output.
 *
 * Dynacat version used in the Dynacat Configurator Flow.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class ObjectFieldPickerController_Dynacat {

    @AuraEnabled(cacheable=true)
    public static String getObjects() {
                
        // Query and sort all SObjects in the org, for use in a new Deployment.
        Map<String, PicklistValue_Dynacat> sObjectMap = new Map<String, PicklistValue_Dynacat>();
        for(Schema.SObjectType objTyp : Schema.getGlobalDescribe().Values()){
           String name = objTyp.getDescribe().getName();
           if(!objTyp.getDescribe().isCustomSetting() && objTyp.getDescribe().isCreateable() &&
                objTyp.getDescribe().getRecordTypeInfos().size() > 0) {   
                    PicklistValue_Dynacat picklist = new PicklistValue_Dynacat();
                    picklist.label = objTyp.getDescribe().getLabel() + ' (' + name + ')';
                    picklist.value = name;
                    sObjectMap.put(picklist.label, picklist);
           }
        }
        List<String> sortedLabels = new List<String>(sObjectMap.keyset());
        sortedLabels.sort();
        List<PicklistValue_Dynacat> sObjects = new List<PicklistValue_Dynacat>();
        for(String label : sortedLabels) sObjects.add(sObjectMap.get(label));

        return JSON.serialize(sObjects);
    }
    
    @AuraEnabled(cacheable=true)
    public static String getFields(String objectApiName, String fieldTypes) {
        
        List<String> filterableTypes = fieldTypes.split('[,]{1}[\\s]?');
        
        System.debug(filterableTypes);

        
        String[] types = new String[]{objectApiName};
        Schema.DescribeSObjectResult objDescribe = Schema.describeSObjects(types)[0];

        Map<String,Schema.SObjectField> objfields = objDescribe.fields.getMap();
        
        Map<String, PicklistValue_Dynacat> picklistMap = new Map<String, PicklistValue_Dynacat>();
        Map<String, FieldDescribe> fieldMap = new Map<String, FieldDescribe>();
        
        for(String fieldName : objfields.keyset()) {
            Schema.DescribeFieldResult dfr = objFields.get(fieldName).getDescribe();
            if(dfr.isAccessible() && dfr.isFilterable()) {
                
                FieldDescribe fd = new FieldDescribe();
                fd.name = dfr.getName();
                fd.label = dfr.getLabel();
                fd.type = String.valueOf(dfr.getType());
                
                if(filterableTypes.contains(fd.type)) {
                    if(fd.type == 'PICKLIST' || fd.type == 'MULTIPICKLIST') {
                        fd.picklistValues = '';
                        List<Schema.PicklistEntry> picklistValues = dfr.getPicklistValues();
                        Boolean first = true;
                        for(Schema.PicklistEntry pl : picklistValues) {
                            fd.picklistValues += (first) ? pl.getValue() : ', '+pl.getValue();
                            first = false;
                        }
                    }
                
                    if(fd.type == 'REFERENCE') {
                        Schema.sObjectType obj = dfr.getReferenceTo()[0];
                        fd.referenceTo = obj.getDescribe().getName();
                        fd.referenceToLabel = obj.getDescribe().getLabel();
                        fd.relationshipName = dfr.getRelationshipName();
                    }

                    fieldMap.put(fd.name, fd);
                    
                    PicklistValue_Dynacat picklist = new PicklistValue_Dynacat();
                    picklist.value = dfr.getName();
                    picklist.label = dfr.getLabel() + ' (' + picklist.value + ')';
                    picklistMap.put(picklist.label, picklist);

                    
                }
            }
            
        }
        List<String> sortedLabels = new List<String>(picklistMap.keyset());
        sortedLabels.sort();
        List<PicklistValue_Dynacat> fields = new List<PicklistValue_Dynacat>();
        for(String label : sortedLabels) fields.add(picklistMap.get(label));

        ObjectFieldsResponse response = new ObjectFieldsResponse();
        response.fields = fields;
        response.fieldMap = fieldMap;
        return JSON.serialize(response);
    }
    
    public class ObjectFieldsResponse {
        public List<PicklistValue_Dynacat> fields;
        public Map<String, FieldDescribe> fieldMap;
    }
    
    public class FieldDescribe {
        public String name;
        public String label;
        public String type;
        public String picklistValues;
        public String referenceTo;
        public String referenceToLabel;
        public String relationshipName;
    }
}