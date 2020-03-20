import apogeeutil from "/apogeeutil/apogeeUtilLib.js";

import ParentComponentView from "/apogeeview/componentdisplay/ParentComponentView.js";
import LiteratePageComponentDisplay from "/apogeeview/componentdisplay/literatepage/LiteratePageComponentDisplay.js";

/** This component represents a folderFunction, which is a function that is programmed using
 *apogee tables rather than writing code. */
export default class FolderFunctionComponentView extends ParentComponentView {
        
    constructor(modelView,component) {
        //extend parent component
        super(modelView,component);
    }

    instantiateTabDisplay() {
        return new LiteratePageComponentDisplay(this); 
    }

    //==============================
    // Child Display
    //==============================

    /**  This method retrieves the table edit settings for this component instance
     * @protected */
    getTableEditSettings() {
        return FolderFunctionComponentView.TABLE_EDIT_SETTINGS;
    }

}

//=======================
// Child View SEttings
//=======================

FolderFunctionComponentView.VIEW_MODES = [
];

FolderFunctionComponentView.TABLE_EDIT_SETTINGS = {
    "viewModes": FolderFunctionComponentView.VIEW_MODES,
}


//======================================
// This is the component generator, to register the component
//======================================

FolderFunctionComponentView.componentName = "apogeeapp.app.FolderFunctionComponent";
FolderFunctionComponentView.hasTabEntry = true;
FolderFunctionComponentView.hasChildEntry = true;
FolderFunctionComponentView.ICON_RES_PATH = "/componentIcons/folderFunction.png";


FolderFunctionComponentView.propertyDialogLines = [
    {
        "type":"inputElement",
        "heading":"Arg List: ",
        "resultKey":"argListString"
    },
    {
        "type":"inputElement",
        "heading":"Return Val: ",
        "resultKey":"returnValueString"
    }
];