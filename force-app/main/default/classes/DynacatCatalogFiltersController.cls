/*
 * Controller class for the dynacatCatalogFilter LWC, which renders all the different filter options and sends a message
 * to the catalog components when they change.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

public class DynacatCatalogFiltersController {

    public static String separator() { return String.fromCharArray( new List<Integer> { 31 } ); }

    @AuraEnabled(cacheable=true)
    public static String getActiveAttributes(String deployment) {
                
        // The ultimate aim of this method is to end up with a map of top level attributes, with all of their children, 
		// grandchildren and beyond nested underneath them.  It's achieved by starting at the lowest level, and nesting each
		// attribute underneath its parent.  As it moves up the tree it continues to reparent the lower limbs (?), until eventually
		// only those attributes without parents are left

		Dynacat_Deployment__c dd = [SELECT Id, Name, Object_API_Name__c FROM Dynacat_Deployment__c WHERE Name=:deployment];
		String objectApiName = dd.Object_API_Name__c;
        
        Set<String> objectNames = new Set<String>();
        objectNames.add(objectApiName);
        
        List<Dynacat_Filter__c> filterConfigs = [SELECT Id,
                                                  		Name,
                                                 		Filter__c,
                                                  		Object_API_Name__c,
                                                  		Order__c,
                                                 		Type__c,
                                                 		Display_Type__c,
                                                  		Field_Type__c,
                                                  		Valid_Picklist_Values__c,
                                                  		Min__c,
                                                  		Max__c,
                                                  		Checked_Label__c,
                                                  		Unchecked_Label__c,
                                                 		Attribute_Lookup_Field_Name__c
                                                   FROM Dynacat_Filter__c
                                                  WHERE Deployment_Id__c = :dd.Id
                                               ORDER BY Order__c ASC];
                
		System.debug('Configs Size: '+filterConfigs.size());
        
        // Create a couple of empty maps that we'll store all the attributes and the level hierarchy in
        Map<String, Attribute> attributes = new Map<String, Attribute>();
    	Map<String, List<String>> levels = new Map<String, List<String>>();
       	List<Attribute> attributeList = new List<Attribute>();

        if(filterConfigs.size() > 0) {
        	List<String> attributeExternalIds = new List<String>();
            List<String> fieldNames = new List<String>();
            List<String> sectionNames = new List<String>();
            Map<String, Dynacat_Filter__c> configMap = new Map<String, Dynacat_Filter__c>();
            Map<String, Integer> levelOffset = new Map<String, Integer>();
        	for(Dynacat_Filter__c c : filterConfigs) {
                if(c.Type__c == 'Attribute') {
                    attributeExternalIds.add('%'+c.Filter__c+'>%');
                } else if(c.Type__c == 'Field') {
                    fieldNames.add(c.Filter__c);
                    if(c.Object_API_Name__c != null) objectNames.add(c.Object_API_Name__c);
                } else if(c.Type__c == 'Section') {
                    sectionNames.add(c.Filter__c);
                }
                configMap.put(c.Filter__c, c);
	        }
            
            if(sectionNames.size() > 0) {
                
                for(Integer i=0; i<sectionNames.size(); i++) {
                    
                    String sectionName = sectionNames[i];
                    
                    Attribute attribute = new Attribute();
                    attribute.name = sectionName;
                    attribute.label = sectionName;
                    attribute.type = 'section';
                    attribute.order = configMap.get(sectionName).Order__c;
                    attribute.level = 0;
                    attribute.isSection = true;
                    attribute.id = 's.' +i+ '.' +sectionName;
                    
                    attributes.put(sectionName, attribute);
                    
                }
                
            }
            
            if(fieldNames.size() > 0) {
                
                List<Schema.DisplayType> listTypes = new List<Schema.DisplayType>{Schema.DisplayType.PICKLIST, Schema.DisplayType.MULTIPICKLIST };
                List<Schema.DisplayType> rangeTypes = new List<Schema.DisplayType>{Schema.DisplayType.DOUBLE, Schema.DisplayType.INTEGER, Schema.DisplayType.CURRENCY, Schema.DisplayType.PERCENT };
                List<Schema.DisplayType> booleanTypes = new List<Schema.DisplayType>{Schema.DisplayType.BOOLEAN };
                List<Schema.DisplayType> dateTypes = new List<Schema.DisplayType>{Schema.DisplayType.DATE, Schema.DisplayType.DATETIME };
                    
                Map<String, Map<String, Schema.SobjectField>> fieldsMap = new Map<String, Map<String, Schema.SobjectField>>();
                
                try {
                    
                    for(String obj : objectNames) {
	                    Map<String, Schema.SobjectField> fieldMap = ((SObject)(Type.forName('Schema.'+obj).newInstance())).getSObjectType().getDescribe().fields.getMap();
                        fieldsMap.put(obj, fieldMap);
                    }
                    
                
                	for(String fieldName : fieldNames) {
                        
                        String objName = (configMap.get(fieldName).Object_API_Name__c != null) ? configMap.get(fieldName).Object_API_Name__c : objectApiName;
                        System.debug('Field Object Name: '+objName);

                        
                        String field = (fieldName.contains('.')) ? fieldName.substring(fieldName.lastIndexOf('.')+1) : fieldName;

                    	Schema.DescribeFieldResult fieldDescribe = fieldsMap.get(objName).get(field).getDescribe();
						System.debug('Describe: '+fieldDescribe);
                    	Attribute rootAttribute = new Attribute();
                    	rootAttribute.name = fieldName;
                    	rootAttribute.label = fieldDescribe.getLabel();
                    	rootAttribute.type = String.valueOf(fieldDescribe.getType());
                    	rootAttribute.order = configMap.get(fieldName).Order__c;
                    	rootAttribute.level = 0;
                    
                    	String displayType = configMap.get(fieldName).Display_Type__c;                    
                    	rootAttribute.isCheckbox = (displayType == 'Checkbox') ? true : false;
                    	rootAttribute.isRadio = (displayType == 'Radio Button') ? true : false;
                    	rootAttribute.isPicklist = (displayType == 'Picklist') ? true : false;
                    	rootAttribute.isMSPicklist = (displayType == 'Multi-Select Picklist') ? true : false;
                    	rootAttribute.isRange = (displayType == 'Range') ? true : false;
                        rootAttribute.isDate = (displayType == 'Date') ? true : false;
                    
                    	System.debug('** Field ** Label: '+fieldDescribe.getLabel()+', Name: '+fieldName+', Type: '+fieldDescribe.getType());
                    	if(listTypes.contains(fieldDescribe.getType())) {
	                    	rootAttribute.id = fieldName;
	                    	rootAttribute.selectable = false;
	                    	rootAttribute.hasChildren = true;
                            
                            Set<String> picklistSet = new Set<String>();
                            String picklistValues = configMap.get(fieldName).Valid_Picklist_Values__c;
                            if(picklistValues != null && picklistValues != '') {
                                List<String> picklistArray = picklistValues.split(',');
                                System.debug(picklistArray);
                                for(String val : picklistArray) {
                                    picklistSet.add(val.trim().toLowerCase());
                                }
                            }
    	                	rootAttribute.x_children = new List<Attribute>();
                        	List<Schema.PicklistEntry> ple = fieldDescribe.getPicklistValues();
                        	for(Integer i=0; i<ple.size(); i++) {
                                if(picklistSet.size() == 0 || picklistSet.contains(ple[i].getValue().toLowerCase())) {
                                	Attribute childAttribute = new Attribute();
                            		childAttribute.id = ple[i].getValue();
                            		childAttribute.name = ple[i].getValue();
                                	childAttribute.path = fieldName+separator()+ple[i].getValue()+separator();
                            		childAttribute.label = ple[i].getLabel();
                            		childAttribute.order = i;
                            		childAttribute.level = 1;
                            		childAttribute.selectable = true;
                            		childAttribute.hasChildren = false;
                            		rootAttribute.x_children.add(childAttribute);
                                }
							}
                            
                        } else if(rangeTypes.contains(fieldDescribe.getType())) {
	                    	rootAttribute.id = fieldName;
	                    	rootAttribute.selectable = true;
	                    	rootAttribute.hasChildren = false;
                            rootAttribute.rangeMin = configMap.get(fieldName).Min__c;
                            rootAttribute.rangeMax = configMap.get(fieldName).Max__c;
                            
                        } else if(booleanTypes.contains(fieldDescribe.getType())) {
                            rootAttribute.id = fieldName;
                            rootAttribute.selectable = false;
                            rootAttribute.hasChildren = true;
                            rootAttribute.x_children = new List<Attribute>();
                            
                            Attribute choice1 = new Attribute();
                            choice1.id = 'true';
                            choice1.name = 'true';
                            choice1.path = fieldName+separator()+'true'+separator();
                            choice1.label = configMap.get(fieldName).Checked_Label__c;
                            choice1.order = 1;
                            choice1.level = 1;
                            choice1.selectable = true;
                            choice1.hasChildren = false;
                            rootAttribute.x_children.add(choice1);
                            
                            Attribute choice2 = new Attribute();
                            choice2.id = 'false';
                            choice2.name = 'false';
                            choice2.path = fieldName+separator()+'false'+separator();
                            choice2.label = configMap.get(fieldName).Unchecked_Label__c;
                            choice2.order = 2;
                            choice2.level = 1;
                            choice2.selectable = true;
                            choice2.hasChildren = false;
                            rootAttribute.x_children.add(choice2);
                            
                        } else if(dateTypes.contains(fieldDescribe.getType())) {
                            rootAttribute.id = fieldName;
                            rootAttribute.selectable = true;
                            rootAttribute.hasChildren = false;
                        }
                        attributes.put(fieldName, rootAttribute);
                	}
                
                } catch(Exception e) {
                    System.debug('** Querying Field Properties Failed. **');
                    System.debug(e.getMessage());
                }

                                
            }
            
            if(attributeExternalIds.size() >0) {

                System.debug(attributeExternalIds);
                
                // Query all active attributes from lowest level up        
    			List<Dynacat_Attribute__c> attributeRecords = [SELECT Id, Path__c, Parent_Attribute__c, External_Id__c, Name, Selectable__c, Order__c, 
                                                         Level__c, Type__c FROM Dynacat_Attribute__c WHERE Path__c LIKE :attributeExternalIds AND Active__c=TRUE ORDER BY Level__c DESC, Order__c ASC];
                
                System.debug(attributeRecords);
                
                // Create a map of all attributes with the Record Id as the key, so we can easily pull out parent details as we iterate through.
        		Map<String, Dynacat_Attribute__c> attributeMap = new Map<String, Dynacat_Attribute__c>(attributeRecords);
                                

                        
        		for(Dynacat_Attribute__c att : attributeRecords) {
        
            		// Because of the SOQL order, we iterate from the leaf nodes up, and are interested in each attributes parents.
            		// Only the last, top-level attributes won't have parents
            		if(att.Parent_Attribute__c != null && !configMap.keyset().contains(att.External_Id__c)) {

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
		
        		System.debug('Nested Map: '+attributes);
                System.debug('Keyset: '+attributes.keyset());
                
            }
                            
            for(Dynacat_Filter__c c : filterConfigs) {
                    Attribute att = attributes.get(c.Filter__c);
                	System.debug('Attribute: '+att);
                	att.order = c.Order__c;
                	if(att.type == 'attribute') att.lookupFieldName = c.Attribute_Lookup_Field_Name__c;
                	if(att.level > 0) {
                    	Integer offset = (Integer)att.level;
                    	cascadeAttribute(att, offset);
                	}
                	attributeList.add(att);
            } 
            
        }
        
        // Add the Top-Level Attributes objects to a list and sort by order.
        DynacatAttributeComparable[] attList = new List<DynacatAttributeComparable>();
        for(String key : attributes.keyset()) attList.add( new DynacatAttributeComparable(attributes.get(key)));
        attList.sort();
        
        List<Attribute> finalAttributeList = new List<Attribute>();
        for(DynacatAttributeComparable att : attList) finalAttributeList.add(att.attribute);
      
        Response resp = new Response();
        resp.attributeList = finalAttributeList;
        resp.attributes = attributes;
        resp.levels = levels;

        String jsonResponse = JSON.serialize(resp,true).replace('x_children','_children');
        return jsonResponse;

	}
    
    private static Attribute cascadeAttribute(Attribute attribute, Integer offset) {
        attribute.level = attribute.level-offset;
        if(attribute.hasChildren) {
            for(Attribute a : attribute.x_children) {
                cascadeAttribute(a, offset);
            }
        }
        return attribute;
    }
    
    private static Attribute buildAttribute(Dynacat_Attribute__c attribute, Boolean hasChildren) {
    	Attribute att = new Attribute();
    	att.id = attribute.External_Id__c;
        att.name = attribute.External_Id__c;
        att.path = attribute.Path__c.replace('>',separator());
    	att.label = attribute.Name;
        att.type = 'attribute';
        String displayType = attribute.Type__c;
        att.isCheckbox = (displayType == 'Checkbox') ? true : false;
        att.isRadio = (displayType == 'Radio Button') ? true : false;
        att.isPicklist = (displayType == 'Picklist') ? true : false;
        att.isMSPicklist = (displayType == 'Multi-Select Picklist') ? true : false;
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
        public String type;
        public String fieldType;
        public String lookupFieldName;
        public Boolean isCheckbox;
        public Boolean checked;// = false;
        public Boolean indeterminate;// = false;
        public Boolean isRadio;
        public Boolean isPicklist;
        public Boolean isMSPicklist;
        public Boolean isRange;
        public Boolean isDate;
        public Boolean isSection;
        public Decimal rangeMin;
        public Decimal rangeMax;
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
    }
    
}