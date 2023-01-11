/*
 * Controller class for the dynacatAttributeSelector LWC, which is used to easily select the attributes that
 * apply to each record.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class DynacatAttSelectorController {
    
    @AuraEnabled(cacheable=true)
    public static String getActiveAttributes(Id recordId, String objectApiName, String lookupFieldName) {
		
        System.debug('Record Id: '+recordId);
        System.debug('Object API Name: '+objectApiName);
               
        // The ultimate aim of this method is to end up with a map of top level attributes, with all of their children, 
		// grandchildren and beyond nested underneath them.  It's achieved by starting at the lowest level, and nesting each
		// attribute underneath its parent.  As it moves up the tree it continues to reparent the lower limbs (?), until eventually
		// only those attributes without parents are left

        // Query all active attributes from lowest level up        
    	List<Dynacat_Attribute__c> attributeRecords = [SELECT Id, Path__c, Parent_Attribute__c, External_Id__c, Name, Selectable__c, Order__c, Level__c FROM Dynacat_Attribute__c WHERE Active__c=TRUE ORDER BY Level__c DESC, Order__c ASC];

        // Create a map of all attributes with the Record Id as the key, so we can easily pull out parent details as we iterate through.
        Map<String, Dynacat_Attribute__c> attributeMap = new Map<String, Dynacat_Attribute__c>(attributeRecords);

        // Create a couple of empty maps that we'll store all the attributes and the level hierarchy in
        Map<String, Attribute> attributes = new Map<String, Attribute>();
    	Map<String, List<String>> levels = new Map<String, List<String>>();
                        
        for(Dynacat_Attribute__c att : attributeRecords) {
        
            // Because of the SOQL order, we iterate from the leaf nodes up, and are interested in each attributes parents.
            // Only the last, top-level attributes won't have parents
            if(att.Parent_Attribute__c != null) {

                Attribute parent;
        		Attribute current;

                // Get the parent record from the attribute map
                Dynacat_Attribute__c parAtt = attributeMap.get(att.Parent_Attribute__c);
                
                // For the first node on the branch, we need to add the parent attribute to the map
                if(!attributes.keyset().contains(parAtt.External_Id__c)) {
            		parent = buildAttribute(parAtt, true);

                    // and add the parent to the map of levels as well, which can be used to set which levels should initially be expanded/collapsed
                    String level = 'L'+String.valueOf(parent.level);
                    if(!levels.keyset().contains(level)) {
                        levels.put(level, new List<String>{parent.id});
                    } else {
                        List<String> currentLevels = levels.get(level);
                        currentLevels.add(parent.id);
                        levels.put(level, currentLevels);
                    }                    

                // For subsequent nodes, the parent will already be there
                } else {
                    parent = attributes.get(parAtt.External_Id__c);
                }
            
            	// As we move up the levels, the parent attributes become the current attributes, so may
            	// already exist in the map.  If they don't (ie. if they're a leaf node) then add them in to 
            	// the map and the levels map/list
            	Boolean alreadyExists = false;
            	if(!attributes.keyset().contains(att.External_Id__c)) {
                	current = buildAttribute(att, false);
                    String level = 'L'+String.valueOf(current.level);
                    if(levels.get(level) == null) {
                        levels.put(level, new List<String>{current.id});                        
                    } else {
                        List<String> currentLevels = levels.get(level);
                        currentLevels.add(current.id);
                        levels.put(level, currentLevels);                        
                    }
        		} else {
            		current = attributes.get(att.External_Id__c);
            		alreadyExists = true;
            	}
            
                // Add the current attribute to its parents list of children
            	if(parent.x_children == null) parent.x_children = new List<Attribute>();
            	parent.x_children.add(current);
            	attributes.put(parent.id, parent);
                            
                // And if the attribute already exists, remove it since it's now a child of it's parent
            	if(alreadyExists) attributes.remove(att.External_Id__c);
                
        	}
    	}
        
        // Add the Top-Level Attributes objects to a list and sort by order.
        DynacatAttSelectorComparable[] attList = new List<DynacatAttSelectorComparable>();
        for(String key : attributes.keyset()) attList.add( new DynacatAttSelectorComparable(attributes.get(key)));
        attList.sort();
        
        List<Attribute> finalAttributeList = new List<Attribute>();
        for(DynacatAttSelectorComparable att : attList) finalAttributeList.add(att.attribute);
             

        // The response returns the nested attribute map, and the levels, and the current attributes for the record
        Response resp = new Response();

        resp.attributeList = finalAttributeList;
        resp.attributes = attributes;
        resp.levels = levels;

        // Query the current record attributes
        String soqlQueryCurrentAttributes = 'SELECT Name, Attribute__r.External_Id__c FROM Dynacat_Record_Attribute__c WHERE ' + lookupFieldName + '= \'' + recordId + '\'';
        List<Dynacat_Record_Attribute__c> recordAttributes = Database.query(soqlQueryCurrentAttributes);
        if(recordAttributes.size() > 0) {
			List<String> savedAttributes = new List<String>();
			for(Dynacat_Record_Attribute__c ra : recordAttributes) savedAttributes.add(ra.Attribute__r.External_Id__c);
        	resp.savedAttributes = savedAttributes;
        }
        
        // Return the response in JSON format
        String jsonResponse = JSON.serialize(resp,true).replace('x_children','_children');
        return jsonResponse;

	}
    
    
    @AuraEnabled(cacheable=false)
    public static Boolean saveRecordAttributes(String newAttributes, Id recordId, String objectApiName, String lookupFieldName) {
        
        // This method saves the updated record attributes when the button is clicked. It simply deletes all the old record attributes, and replaces them with
        // new ones that reflect the currently selected attributes.
        
        System.debug('Save Record Id: '+recordId);
        System.debug('Save Object API Name: '+objectApiName);
        System.debug('Save Lookup Field Name: '+lookupFieldName);
        System.debug(newAttributes);
		
        // First retrieve the existing attributes
		String soqlQueryCurrentAttributes = 'SELECT Id FROM Dynacat_Record_Attribute__c WHERE ' + lookupFieldName + '= \'' + recordId + '\'';
        List<Dynacat_Record_Attribute__c> recAttributesToDelete = Database.query(soqlQueryCurrentAttributes);
		
        // Now insert the new attributes
        List<String> newAttributesList = (List<String>)JSON.deserialize(newAttributes, List<String>.class);
        List<Dynacat_Record_Attribute__c> recAttributesToInsert = null;
        if(newAttributesList.size() > 0) {
			recAttributesToInsert = new List<Dynacat_Record_Attribute__c>();
            String soqlQueryCurrentRecord = 'SELECT Id FROM ' + objectApiName + ' WHERE Id = \'' + recordId + '\'';
            SObject sobj = Database.query(soqlQueryCurrentRecord);
            for(String newAtt : newAttributesList) {
                Dynacat_Record_Attribute__c ra = new Dynacat_Record_Attribute__c();
                ra.put(lookupFieldName, recordId);
                ra.Attribute_UID__c = newAtt;
                ra.Record_UID__c = (String)sobj.get('Id');
                ra.Attribute__r = new Dynacat_Attribute__c(External_Id__c=newAtt);
                recAttributesToInsert.add(ra);
            }
        }
        System.debug(recAttributesToInsert);
        
        try {
            if(recAttributesToInsert.size() > 0) List<Database.SaveResult> results = Database.insert(recAttributesToInsert);
            if(recAttributesToDelete.size() > 0) delete(recAttributesToDelete);
            return true;
        } catch(Exception e) {
            System.debug(e.getMessage());
        }
      
        return false;
        
    }
    
    private static Attribute buildAttribute(Dynacat_Attribute__c attribute, Boolean hasChildren) {
    	Attribute att = new Attribute();
    	att.id = attribute.External_Id__c;
        att.name = attribute.External_Id__c;
        att.path = attribute.Path__c;
    	att.label = attribute.Name;
    	att.order = attribute.Order__c;
    	att.level = attribute.Level__c;
        att.selectable = attribute.Selectable__c;
        att.hasChildren = hasChildren;
        return att;
    }
    
    public class Attribute {
    	public String id;
        public String path;
    	public String name;
        public String label;
    	public Decimal order;
    	public Decimal level;
        public Boolean selectable;
        public Boolean hasChildren;
    	public List<Attribute> x_children;
	}   

    private class Response {
        private List<Attribute> attributeList;
        private Map<String, Attribute> attributes;
        private Map<String, List<String>> levels;
        private List<String> savedAttributes;
    }
       
}