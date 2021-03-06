import ComponentView from "/apogeejs-view-lib/src/componentdisplay/ComponentView.js";
import AceTextEditor from "/apogeejs-view-lib/src/datadisplay/AceTextEditor.js";
import StandardErrorDisplay from "/apogeejs-view-lib/src/datadisplay/StandardErrorDisplay.js";
import dataDisplayHelper from "/apogeejs-view-lib/src/datadisplay/dataDisplayHelper.js";
import DATA_DISPLAY_CONSTANTS from "/apogeejs-view-lib/src/datadisplay/dataDisplayConstants.js";

export default class JsonPlusTableComponentView extends ComponentView {

    constructor(appViewInterface,JsonPlusTableComponent) {
        super(appViewInterface,JsonPlusTableComponent);
    }

    //==============================
    // Protected and Private Instance Methods
    //==============================

    /**  This method retrieves the table edit settings for this component instance
     * @protected */
    getTableEditSettings() {
        return JsonPlusTableComponentView.TABLE_EDIT_SETTINGS;
    }

    /** This method should be implemented to retrieve a data display of the give type. 
     * @protected. */
    getDataDisplay(displayContainer,viewType) {
        
        var dataDisplaySource;
        var app = this.getApp();
        
        
        //create the new view element;
        switch(viewType) {
            case JsonPlusTableComponentView.VIEW_DATA:
                dataDisplaySource = this.getDataSource();
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/json",AceTextEditor.OPTION_SET_DISPLAY_SOME);
                
            case JsonPlusTableComponentView.VIEW_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberFunctionBodyDataSource(app,this,"member");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            case JsonPlusTableComponentView.VIEW_SUPPLEMENTAL_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberSupplementalDataSource(app,this,"member");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);

            case ComponentView.VIEW_ERROR: 
                dataDisplaySource = dataDisplayHelper.getStandardErrorDataSource(app,this);
                return new StandardErrorDisplay(displayContainer,dataDisplaySource);
                
            default:
    //temporary error handling...
                console.error("unrecognized view element: " + viewType);
                return null;
        }
    }

    
    /** This data source is read only (no edit). It returns text for a json */
    getDataSource() {

        return {
            doUpdate: () => {
                //return value is whether or not the data display needs to be udpated
                let component = this.getComponent();
                let reloadData = component.isMemberDataUpdated("member");
                let reloadDataDisplay = false;
                return {reloadData,reloadDataDisplay};
            },

            getData: () => {
                let member = this.getComponent().getMember();
                let state = member.getState();
                if(state != apogeeutil.STATE_NORMAL) {
                    //handle non-normal state returning wrapped data
                    let wrappedData = dataDisplayHelper.getEmptyWrappedData();
                    wrappedData.hideDisplay = true;
                    wrappedData.data = apogeeutil.INVALID_VALUE;
                    switch(member.getState()) {
                        case apogeeutil.STATE_ERROR: 
                            wrappedData.messageType = DATA_DISPLAY_CONSTANTS.MESSAGE_TYPE_ERROR;
                            wrappedData.message = "Error in value: " + member.getErrorMsg();
                            break;

                        case apogeeutil.STATE_PENDING:
                            wrappedData.messageType = DATA_DISPLAY_CONSTANTS.MESSAGE_TYPE_INFO;
                            wrappedData.message = "Value pending!";
                            break;

                        case apogeeutil.STATE_INVALID:
                            wrappedData.messageType = DATA_DISPLAY_CONSTANTS.MESSAGE_TYPE_INFO;
                            wrappedData.message = "Value invalid!";
                            break;

                        default:
                            throw new Error("Unknown display data value state!")
                    }
                    return wrappedData;
                }

                let jsonPlus = member.getData();

                var textData;
                if(jsonPlus == apogeeutil.INVALID_VALUE) {
                    //for invalid input, convert to display an empty string
                    textData = "";
                }
                else if(jsonPlus === undefined) {
                    textData = "undefined";
                }
                else {
                    let modifiedValueJson = replaceFunctions(jsonPlus);
                    textData = JSON.stringify(modifiedValueJson,null,FORMAT_STRING);
                }

                return textData;
            }
        }
    }


}


const FORMAT_STRING = "\t";

/** The following functions update a json with functions to be a plain json, with a
 * replacement string for any functions. (It is pretty inefficient.) */

const FUNCTION_REPLACEMENT_STRING = "[**FUNCTION**]";

function replaceFunctions(jsonPlus) {
    var copiedJson;

    var objectType = apogeeutil.getObjectType(jsonPlus);
    
    switch(objectType) {
        case "Object":
            copiedJson = replaceFunctionInObject(jsonPlus);
            break;
            
        case "Array": 
            copiedJson = replaceFunctionsInArray(jsonPlus);
            break;

        case "Function": 
            //copiedJson = FUNCTION_REPLACEMENT_STRING;
            copiedJson = jsonPlus.toString();
            break;
            
        default:
            copiedJson = jsonPlus;
    }
    
    return copiedJson;
}

function replaceFunctionInObject(jsonPlus) {
    var copiedJson = {};
    for(let key in jsonPlus) {
        copiedJson[key] = replaceFunctions(jsonPlus[key]);
    }
    return copiedJson;
}

function replaceFunctionsInArray(jsonPlus) {
    var copiedJson = [];
    for(var i = 0; i < jsonPlus.length; i++) {
        var element = jsonPlus[i];
        copiedJson.push(apogeeutil.getNormalizedCopy(element));
    }
    return copiedJson;
}

//===============================
// Internal Settings
//===============================

JsonPlusTableComponentView.VIEW_DATA = "Data";
JsonPlusTableComponentView.VIEW_CODE = "Formula";
JsonPlusTableComponentView.VIEW_SUPPLEMENTAL_CODE = "Private";

JsonPlusTableComponentView.VIEW_MODES = [
    ComponentView.VIEW_ERROR_MODE_ENTRY,
    {
        name: JsonPlusTableComponentView.VIEW_DATA,
        label: "Data",
        sourceLayer: "model",
        sourceType: "data",
        isActive: true
    },
    {
        name: JsonPlusTableComponentView.VIEW_CODE,
        label: "Formula",
        sourceLayer: "model",
        sourceType: "function",
        isActive: false
    },
    {
        name: JsonPlusTableComponentView.VIEW_SUPPLEMENTAL_CODE,
        label: "Private",
        sourceLayer: "model",
        sourceType: "private code",
        isActive: false
    }
];

JsonPlusTableComponentView.TABLE_EDIT_SETTINGS = {
    "viewModes": JsonPlusTableComponentView.VIEW_MODES,
    "emptyDataValue": ""
}

//===============================
// External Settings
//===============================

/** This is the component name with which this view is associated. */
JsonPlusTableComponentView.componentName = "apogeeapp.ExtendedJsonCell";

/** If true, this indicates the component has a tab entry */
JsonPlusTableComponentView.hasTabEntry = false;
/** If true, this indicates the component has an entry appearing on the parent tab */
JsonPlusTableComponentView.hasChildEntry = true;
/** This is the icon url for the component. */
JsonPlusTableComponentView.ICON_RES_PATH = "/icons3/jsonCellIcon.png";
/** This field gives the default value for the JSON taht should be deserialized to
 * create the member for this object. The field "name" can be omitted. This will 
 * be added when the member is created. */

