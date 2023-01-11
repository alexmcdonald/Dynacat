/*
 * APEX Invocable Action for Salesforce Flows, retrieves all available SObjects from the org and returns them in a
 * collection that can be used as a Collection Choice Set.
 *
 * Dynacat version used in the Dynacat Configurator Flow.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class SObjectRetriever_Dynacat {

    @InvocableMethod(label='Get All SObjects')
    public static List<Result> execute() {
        
        // Query and sort all SObjects in the org, for use in new Deployments and Filters
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
                
        Result result = new Result();
        result.sobjects = sObjects;
        
        return new List<Result>{result};
    
    }   
    
    public class Result {
        @InvocableVariable public List<PicklistValue_Dynacat> sobjects;
    }
       
}