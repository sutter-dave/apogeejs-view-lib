import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import ComponentView from "/apogeejs-view-lib/src/componentdisplay/ComponentView.js";
import AceTextEditor from "/apogeejs-view-lib/src/datadisplay/AceTextEditor.js";
import ConfigurableFormEditor from "/apogeejs-view-lib/src/datadisplay/ConfigurableFormEditor.js";
import dataDisplayHelper from "/apogeejs-view-lib/src/datadisplay/dataDisplayHelper.js";
import UiCommandMessenger from "/apogeejs-view-lib/src/commandseq/UiCommandMessenger.js";

/** This ccomponent represents a data value, with input being from a configurable form.
 * This is an example of componound component. The data associated with the form
 * can be accessed from the variables (componentName).data. There are also subtables
 * "layout" which contains the form layout and "isInputValid" which is a function
 * to validate form input.
 * If you want a form to take an action on submit rather than create and edit a 
 * data value, you can use the dynmaic form. */
export default class FormDataComponentView extends ComponentView {

    constructor(appViewInterface,folderComponent) {
        //extend edit component
        super(appViewInterface,folderComponent);
    };

    //==============================
    // Protected and Private Instance Methods
    //==============================

    /**  This method retrieves the table edit settings for this component instance
     * @protected */
    getTableEditSettings() {
        return FormDataComponentView.TABLE_EDIT_SETTINGS;
    }

    /** This method should be implemented to retrieve a data display of the give type. 
     * @protected. */
    getDataDisplay(displayContainer,viewType) {
        
        var dataDisplaySource;
        var app = this.getApp();
        
        //create the new view element;
        switch(viewType) {
                
            case FormDataComponentView.VIEW_FORM:
                dataDisplaySource = this.getFormEditorCallbacks();
                return new ConfigurableFormEditor(displayContainer,dataDisplaySource);
                
            case FormDataComponentView.VIEW_LAYOUT_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberFunctionBodyDataSource(app,this,"member.layout");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            case FormDataComponentView.VIEW_LAYOUT_SUPPLEMENTAL_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberSupplementalDataSource(app,this,"member.layout");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
            
            case FormDataComponentView.VIEW_FORM_VALUE:
                dataDisplaySource = dataDisplayHelper.getMemberDataTextDataSource(app,this,"member.data");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/json",AceTextEditor.OPTION_SET_DISPLAY_SOME);
                
            case FormDataComponentView.VIEW_INPUT_INVALID_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberFunctionBodyDataSource(app,this,"member.isInputValid");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            case FormDataComponentView.VIEW_INPUT_INVALID_SUPPLEMENTAL_CODE:
                dataDisplaySource = dataDisplayHelper.getMemberSupplementalDataSource(app,this,"member.isInputValid");
                return new AceTextEditor(displayContainer,dataDisplaySource,"ace/mode/javascript",AceTextEditor.OPTION_SET_DISPLAY_MAX);
                
            default:
    //temporary error handling...
                console.error("unrecognized view element: " + viewType);
                return null;
        }
    }

    getFormEditorCallbacks() {

        var dataDisplaySource = {};
        dataDisplaySource.doUpdate = () => {
            //update depends on multiplefields
            let component = this.getComponent();
            let reloadData = component.isMemberDataUpdated("member.data");
            let reloadDataDisplay = ( (component.isMemberDataUpdated("member.layout")) ||
                (component.isMemberDataUpdated("member.isInputValid")) );
            return {reloadData,reloadDataDisplay};
        },

        //return form layout
        dataDisplaySource.getDisplayData = () => { 
            let layoutFunctionMember = this.getComponent().getField("member.layout");
            if(layoutFunctionMember.getState() == apogeeutil.STATE_NORMAL) {
                let layoutFunction = layoutFunctionMember.getData();   
                if(layoutFunction instanceof Function) {
                    try { 
                        let layout = layoutFunction();
                        if(layout) return layout;
                        else return ConfigurableFormEditor.getEmptyLayout();
                    }
                    catch(error) {
                        console.error("Error reading form layout " + this.getName() + ": " + error.toString());
                        if(error.stack) console.error(error.stack);
                        return ConfigurableFormEditor.getErrorLayout("Error in layout: " + error.toString())
                    }
                }
            }
            //if we get here there was a problem with the return value
            return  apogeeutil.INVALID_VALUE;
            
        }
        
        //return desired form value
        dataDisplaySource.getData = () => {
            let dataTable = this.getComponent().getField("member.data");
            return dataTable.getData();
        } 
        
        //edit ok - always true
        dataDisplaySource.getEditOk = () => {
            return true;
        }
        
        //save data - just form value here
        
        dataDisplaySource.saveData = (formValue) => {
            let layoutFunctionMember = this.getComponent().getField("member.layout");
            let isInputValidFunctionMember = this.getComponent().getField("member.isInputValid");
            //validate input
            var isInputValid = isInputValidFunctionMember.getData();
            let validateResult;
            if(isInputValid instanceof Function) {
                try {
                    validateResult = isInputValid(formValue);
                }
                catch(error) {
                    validateResult = "Error running input validation function.";
                    console.error("Error reading form layout: " + this.getName());
                }
            }
            else {
                validateResult = "Input validate function not valid";
            }

            if(validateResult !== true) {
                if(typeof validateResult != 'string') {
                    validateResult = "Improper format for isInputValid function. It should return true or an error message";
                }
                apogeeUserAlert(validateResult);
                return false;
            }

            //save the data - send via messenger to the variable named "data" in code, which is the field 
            //named "member.data", NOT the field named "data"
            let commandMessenger = new UiCommandMessenger(this,layoutFunctionMember.getId());
            commandMessenger.dataCommand("data",formValue);
            return true;
        }
        
        return dataDisplaySource;
    }

    //======================================
    // Static methods
    //======================================

}


FormDataComponentView.VIEW_FORM = "Form";
FormDataComponentView.VIEW_LAYOUT_CODE = "Layout Code";
FormDataComponentView.VIEW_LAYOUT_SUPPLEMENTAL_CODE = "Layout Private";
FormDataComponentView.VIEW_FORM_VALUE = "Form Value";
FormDataComponentView.VIEW_INPUT_INVALID_CODE = "isInputValid(formValue)";
FormDataComponentView.VIEW_INPUT_INVALID_SUPPLEMENTAL_CODE = "isInputValid Private";

FormDataComponentView.VIEW_MODES = [
    FormDataComponentView.VIEW_FORM,
    FormDataComponentView.VIEW_LAYOUT_CODE,
    FormDataComponentView.VIEW_LAYOUT_SUPPLEMENTAL_CODE,
    FormDataComponentView.VIEW_INPUT_INVALID_CODE,
    FormDataComponentView.VIEW_INPUT_INVALID_SUPPLEMENTAL_CODE,
    FormDataComponentView.VIEW_FORM_VALUE
];

FormDataComponentView.TABLE_EDIT_SETTINGS = {
    "viewModes": FormDataComponentView.VIEW_MODES
}

//======================================
// This is the component generator, to register the component
//======================================


FormDataComponentView.componentName = "apogeeapp.DataFormCell";
FormDataComponentView.hasTabEntry = false;
FormDataComponentView.hasChildEntry = true;
FormDataComponentView.ICON_RES_PATH = "/icons3/formCellIcon.png";
