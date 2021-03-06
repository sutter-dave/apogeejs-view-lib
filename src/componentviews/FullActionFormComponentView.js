import ComponentView from "/apogeejs-view-lib/src/componentdisplay/ComponentView.js";
import AceTextEditor from "/apogeejs-view-lib/src/datadisplay/AceTextEditor.js";
import StandardErrorDisplay from "/apogeejs-view-lib/src/datadisplay/StandardErrorDisplay.js";
import ConfigurableFormEditor from "/apogeejs-view-lib/src/datadisplay/ConfigurableFormEditor.js";
import dataDisplayHelper from "/apogeejs-view-lib/src/datadisplay/dataDisplayHelper.js";
import DATA_DISPLAY_CONSTANTS from "/apogeejs-view-lib/src/datadisplay/dataDisplayConstants.js";
import UiCommandMessenger from "/apogeejs-view-lib/src/commandseq/UiCommandMessenger.js";

/** This is a custom resource component. 
 * To implement it, the resource script must have the methods "run()" which will
 * be called when the component is updated. It also must have any methods that are
 * confugred with initialization data from the model. */
export default class FullActionFormComponentView extends ComponentView {

    constructor(appViewInterface,component) {
        super(appViewInterface,component);
    };

    //==============================
    // Protected and Private Instance Methods
    //==============================

    /**  This method retrieves the table edit settings for this component instance
     * @protected */
    getTableEditSettings() {
        return FullActionFormComponentView.TABLE_EDIT_SETTINGS;
    }

    /** This method should be implemented to retrieve a data display of the give type. 
     * @protected. */
    getDataDisplay(displayContainer,viewType) {
        
        var dataDisplaySource;
        var app = this.getApp();
        
        //create the new view element;
        switch(viewType) {
            
            case FullActionFormComponentView.VIEW_FORM:
                var dataDisplaySource = this.getOutputDataDisplaySource();
                return new ConfigurableFormEditor(displayContainer,dataDisplaySource);

            case FullActionFormComponentView.VIEW_LAYOUT_CODE:
                dataDisplaySource = this.getFormCodeDataDisplaySource(app);
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            case FullActionFormComponentView.VIEW_INPUT_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberFunctionBodyDataSource(app,this,"member");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            case FullActionFormComponentView.VIEW_INPUT_SUPPLEMENTAL_CODE:
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

    getOutputDataDisplaySource() {
        return {

            //This method reloads the component and checks if there is a DATA update. UI update is checked later.
            doUpdate: () => {
                let reloadData = false;
                let reloadDataDisplay = this.getComponent().isFieldUpdated("layoutCode") || this.getComponent().isMemberDataUpdated("member");
                return {reloadData,reloadDataDisplay};
            },

            getDisplayData: () => {       
                let wrappedData = dataDisplayHelper.getEmptyWrappedData();

                //get the layout function
                let component = this.getComponent();
                let {formLayoutFunction,errorMessage} = component.createFormLayoutFunction();
                if(errorMessage) {
                    wrappedData.displayInvalid = true;
                    wrappedData.messageType = DATA_DISPLAY_CONSTANTS.MESSAGE_TYPE_ERROR;
                    wrappedData.message = errorMessage;
                    return wrappedData;
                }

                //load the layout
                //read the input data (checking for non-normal state)
                let member = this.getComponent().getMember();
                let {abnormalWrappedData,inputData} = dataDisplayHelper.getProcessedMemberDisplayData(member);
                if(abnormalWrappedData) {
                    return abnormalWrappedData;
                }

                //use the parent folder as the context base
                let contextMemberId = component.getMember().getParentId();
                let commandMessenger = new UiCommandMessenger(this,contextMemberId);
                try {
                    let layout = formLayoutFunction(commandMessenger,inputData);
                    wrappedData.data = layout;
                    return wrappedData;
                }
                catch(error) {
                    wrappedData.displayInvalid = true;
                    wrappedData.messageType = DATA_DISPLAY_CONSTANTS.MESSAGE_TYPE_ERROR;
                    wrappedData.message = "Error executing layout function: " + error.toString();
                    return wrappedData;
                }
            },

            //no data
            getData: () => null
        }
    }

    getFormCodeDataDisplaySource(app) {
        return {

            //This method reloads the component and checks if there is a DATA update. UI update is checked later.
            doUpdate: () => {
                //return value is whether or not the data display needs to be udpated
                let reloadData = this.getComponent().isFieldUpdated("layoutCode");
                let reloadDataDisplay = false;
                return {reloadData,reloadDataDisplay};
            },

            getData: () => {
                return this.getComponent().getField("layoutCode");
            },

            getEditOk: () => {
                return true;
            },

            saveData: (targetLayoutCode) => {
                let component = this.getComponent();

                var command = {};
                command.type = "fullActionFormUpdateCommand";
                command.memberId = component.getMemberId();
                command.initialValue = component.getField("layoutCode");
                command.targetValue = targetLayoutCode;

                app.executeCommand(command);
                return true; 
            }

        }
    }
}

FullActionFormComponentView.VIEW_FORM = "form";
FullActionFormComponentView.VIEW_LAYOUT_CODE = "layout";
FullActionFormComponentView.VIEW_INPUT_CODE = "input";
FullActionFormComponentView.VIEW_INPUT_SUPPLEMENTAL_CODE = "inputPrivate";

FullActionFormComponentView.VIEW_MODES = [
    ComponentView.VIEW_ERROR_MODE_ENTRY,
    {
        name: FullActionFormComponentView.VIEW_FORM,
        label: "Form",
        isActive: true
    },
    {
        name: FullActionFormComponentView.VIEW_LAYOUT_CODE,
        label: "Layout Code",
        sourceLayer: "app",
        sourceType: "function", 
        argList: "commandMessenger,inputData",
        isActive: true
    },
    {
        name: FullActionFormComponentView.VIEW_INPUT_CODE,
        label: "Input Data Code",
        sourceLayer: "model",
        sourceType: "function", 
        isActive: false
    },
    {   
        name: FullActionFormComponentView.VIEW_INPUT_SUPPLEMENTAL_CODE,
        label: "Input Data Private",
        sourceLayer: "model", 
        sourceType: "private code",
        isActive: false
    }
];

FullActionFormComponentView.TABLE_EDIT_SETTINGS = {
    "viewModes": FullActionFormComponentView.VIEW_MODES
}


//======================================
// This is the control generator, to register the control
//======================================

FullActionFormComponentView.componentName = "apogeeapp.FullActionFormCell";
FullActionFormComponentView.hasTabEntry = false;
FullActionFormComponentView.hasChildEntry = true;
FullActionFormComponentView.ICON_RES_PATH = "/icons3/formCellIcon.png";






