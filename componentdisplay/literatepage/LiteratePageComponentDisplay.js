import apogeeutil from "/apogeeutil/apogeeUtilLib.js";
import {EventManager} from "/apogeeutil/apogeeBaseLib.js";
import {componentInfo} from "/apogeeapp/apogeeAppLib.js";

import {addComponent, addAdditionalComponent} from "/apogeeview/commandseq/addcomponentseq.js";
import PageChildComponentDisplay from "/apogeeview/componentdisplay/literatepage/PageChildComponentDisplay.js"
import {getComponentViewClass} from "/apogeeview/componentViewInfo.js";

import {uiutil,Tab,bannerConstants,getBanner,getIconOverlay} from "/apogeeui/apogeeUiLib.js";

import { TextSelection } from "/prosemirror/dist/prosemirror-state.es.js";



/** This component represents a json table object. */
export default class LiteratePageComponentDisplay {
    
    constructor(componentView) {
        //mixin initialization
        this.eventManagerMixinInit();

        this.componentView = componentView;

        this.isShowing = false;

        this.editorManager = this.componentView.getEditorManager();

        //this is used if we have to prepopolate and child component displays
        this.standInChildComponentDisplays = {};

        this.loadTabEntry();
    };

    getComponentView() {
        return this.componentView;
    }


    getTab() {
        return this.tab;
    }

    getEditorView() {
        return this.editorView;
    }

    closeTab() {
        if(this.tab) {
            this.tab.close();
            this.tab = null;
        }
    }

    getIsShowing() {
        return this.isShowing;
    }

    componentUpdated(component) {

        if(component.isMemberFieldUpdated("member","name")) {
            this.tab.setTitle(this.componentView.getName());
        }

        if(component.isFieldUpdated("editorState")) {
            let editorData = this.componentView.getEditorState();
            this.editorView.updateState(editorData);
            this._checkSelectionForNodeHighlights(editorData);
        }

        if(component.isMemberFieldUpdated("member","state")) {
            this._setBannerState();
        }
    }

    getChildComponentDisplay(name) {
        let folderComponent = this.componentView.getComponent();
        let folderMember = folderComponent.getParentFolderForChildren();

        //lookup component
        var memberId = folderMember.lookupChildId(name);
        if (memberId) {
            var modelView = this.componentView.getModelView();
            var modelManager = modelView.getModelManager();
            var childComponentId = modelManager.getComponentIdByMemberId(memberId);
            var childComponentView = modelView.getComponentViewByComponentId(childComponentId);
            let childComponentDisplay;
            if (childComponentView) {
                childComponentDisplay = childComponentView.getComponentDisplay();
            }
            else {
                //hold a standin if it is requested before we create it.
                childComponentDisplay = this.standInChildComponentDisplays[name];
                if(!childComponentDisplay) {
                    childComponentDisplay = new PageChildComponentDisplay(null, this);
                    this.standInChildComponentDisplays[name] = childComponentDisplay;
                }
            }

            return childComponentDisplay
        }
        else {
            return null;
        }
    }

    /** This creates and adds a display for the child component to the parent container. */
    addChild(childComponentView) {

        //-----------------
        // Get component display
        //-----------------
        let childComponentDisplay;

        //create a new component display for this child
        if(childComponentView.constructor.hasChildEntry) {
            //check if there is a component display already waiting
            childComponentDisplay = this.standInChildComponentDisplays[childComponentView.getName()];
            if(childComponentDisplay) {
                //set up the standin component display
                childComponentDisplay.setComponentView(childComponentView);
                delete this.standInChildComponentDisplays[childComponentView.getName()];
            }
            else {
                childComponentDisplay = new PageChildComponentDisplay(childComponentView,this);
            }
        }

        //set this on the child
        if(childComponentDisplay) {
            //set the component display
            childComponentView.setComponentDisplay(childComponentDisplay);
        }
    }

////////////////////////////////////////////////////////////////////////////////////////////////

    /** This is to record any state in the tab object. */
    getStateJson() {
        return null;
    }

    /** This is to restore any state in the tab object. */
    setStateJson(json) {
    }

    //===============================
    // Private Functions
    //===============================

    /** @private */
    loadTabEntry() {
        let component = this.componentView.getComponent();
        this.tab = new Tab(component.getId());    

        //-----------------------
        //set the content
        //-----------------------
        this.createDisplayContent();

        if(this.tab.getIsShowing()) {
            this.tabShown()
        }
        else {
            this.tabHidden()
        }
        this.tab.addListener(uiutil.SHOWN_EVENT,() => this.tabShown());
        this.tab.addListener(uiutil.HIDDEN_EVENT,() => this.tabHidden());
        this.tab.addListener(uiutil.CLOSE_EVENT,() => this.tabClosed());

        //------------------
        // set menu
        //------------------
        var menu = this.tab.createMenu(this.componentView.getIconUrl());
        var createMenuItemsCallback = () => {
            return this.componentView.getMenuItems();
        }
        menu.setAsOnTheFlyMenu(createMenuItemsCallback);

        //-----------------
        //set the tab title
        //-----------------
        this.tab.setTitle(this.componentView.getName());

        //-----------------
        // apply the banner state
        //-----------------
        this._setBannerState();

        //-----------------------------
        //add the handlers for the tab
        //-----------------------------
        var onClose = () => {
            this.componentView.closeTabDisplay();
            this.destroy();
        }
        this.tab.addListener(uiutil.CLOSE_EVENT,onClose);
    }

    _setBannerState() {
        let bannerState = this.componentView.getBannerState();
        let bannerMessage = this.componentView.getBannerMessage();

        uiutil.removeAllChildren(this.bannerContainer);
        if(bannerState == bannerConstants.BANNER_TYPE_NONE) {
           //no action
        }
        else {
            var banner = getBanner(bannerMessage,bannerState);
            this.bannerContainer.appendChild(banner);
        }

        if(this.tab) {
            var iconOverlay = getIconOverlay(bannerState);
            if(iconOverlay) {
                this.tab.setIconOverlay(iconOverlay);
            }
            else {
                this.tab.clearIconOverlay();
            }
        }
    }

     /** @private */
    createDisplayContent() {

        //-----------
        //page header
        //------------
        this.headerElement = uiutil.createElementWithClass("div","visiui_litPage_header",null);
        this.tab.setHeaderContent(this.headerElement);

        this.editorToolbarContainer = uiutil.createElementWithClass("div","visiui_litPage_editorToolbar",this.headerElement);
        this.componentToolbarContainer = uiutil.createElementWithClass("div","visiui_litPage_componentToolbar",this.headerElement);
        this.bannerContainer = uiutil.createElementWithClass("div","visiui_litPage_banner",this.headerElement);

        this.initComponentToolbar();

        //-------------------
        //page body
        //-------------------
        this.contentElement = uiutil.createElementWithClass("div","visiui_litPage_body",null);
        this.tab.setContent(this.contentElement);

        let pageComponent = this.componentView.getComponent();
        let folder = pageComponent.getParentFolderForChildren();

        //show all children
        var modelView = this.componentView.getModelView();
        var modelManager = modelView.getModelManager();
        var childrenIds = folder.getChildIdMap();
        for(var childName in childrenIds) {
            var childMemberId = childrenIds[childName];
            var childComponentId = modelManager.getComponentIdByMemberId(childMemberId);
            var childComponentView = modelView.getComponentViewByComponentId(childComponentId);
            if(childComponentView) {
                this.addChild(childComponentView);
            }
        }
        
        this.initEditor();
    }

    initComponentToolbar() {

        //THIS IS BAD - IT IS ONLY TO GET THIS WORKING AS A TRIAL
        //MAKE A WAY TO GET COMPONENT GENERATORS FOR BUTTONS RATHER THAN READING A PRIVATE VARIABLE FROM APP
        let pageComponent = this.componentView.getComponent();
        var appView = this.componentView.getModelView().getWorkspaceView().getAppView();
        var app = appView.getApp();

        let standardComponentNames = componentInfo.getStandardComponentNames();
        for(var i = 0; i < standardComponentNames.length; i++) {
            let componentName = standardComponentNames[i];

            let componentClass = componentInfo.getComponentClass(componentName);
            let componentViewClass = getComponentViewClass(componentClass.uniqueName);
            if(componentViewClass.hasChildEntry) {

                var buttonElement = uiutil.createElementWithClass("div","visiui_litPage_componentButton",this.componentToolbarContainer);
                //make the idon
                var imageElement = document.createElement("img")
                imageElement.src = uiutil.getResourcePath(componentViewClass.ICON_RES_PATH);
                var iconElement = uiutil.createElementWithClass("div","visiui_litPage_componentButtonIcon",buttonElement);
                iconElement.appendChild(imageElement);
                //label
                var textElement = uiutil.createElementWithClass("div","visiui_litPage_componentButtonText",buttonElement);
                textElement.innerHTML = componentClass.displayName;
                //add handler
                buttonElement.onclick = () => {

                    this.editorView.focus();

                    var initialValues = {};
                    var parentMember = pageComponent.getParentFolderForChildren();
                    initialValues.parentId = parentMember.getId();

                    addComponent(appView,app,componentClass,initialValues,null,null);
                }
            }
        }

        //add the additional component item
        var buttonElement = uiutil.createElementWithClass("div","visiui_litPage_componentButton",this.componentToolbarContainer);
        var textElement = uiutil.createElementWithClass("div","visiui_litPage_componentButtonText",buttonElement);
        textElement.innerHTML = "Additional Components...";
        buttonElement.onclick = () => {

            this.editorView.focus();

            var initialValues = {};
            var parentMember = pageComponent.getParentFolderForChildren();
            initialValues.parentId = parentMember.getId();

            let appView = this.componentView.getModelView().getWorkspaceView().getAppView();

            //I tacked on a piggyback for testing!!!
            addAdditionalComponent(appView,app,initialValues,null,null);
        }
        this.componentToolbarContainer.appendChild(buttonElement);
    }


    initEditor() {
        
        //start with an empty component display
        var initialEditorState = this.componentView.getEditorState();
        
        this.editorView = this.editorManager.createEditorView(this.contentElement,this,initialEditorState);

        this.contentElement.addEventListener("click",event => this.onClickContentElement(event));

        //add the editor toolbar
        this.editorToolbarContainer.appendChild(this.editorManager.editorToolbarElement);
        
    }

    /** This is used to select the end of the document if the page is clicked below the document end. */
    onClickContentElement(event) {
        if(event.target == this.contentElement) {
            //this.componentView.giveEditorFocusIfShowing();
            let command = this.componentView.getSelectEndOfDocumentCommand();
            let app = this.componentView.getModelView().getApp();
            app.executeCommand(command);
        }    
    }

    /** This function sets any apogee nodes included in the selection to be highlighted. */
    _checkSelectionForNodeHighlights(editorData) {
        let { empty, from, to } = editorData.selection;
        if(empty) {
            from = -1;
            to = -1;
        }
 
        let document = editorData.doc;
        let schema = editorData.schema;
        //travers doc, finding apogee nodes and setting their selection state
        document.forEach( (node,offset) => {
            if(node.type === schema.nodes.apogeeComponent) {
                let inSelection = ((offset >= from)&&(offset < to));
                let nodeName = node.attrs["name"];
                this._setApogeeNodeHighlight(nodeName,inSelection);
            }
            //do not recurse into children
            return false;
        });

    }

    /** This function sets the highlight state for the given node. */
    _setApogeeNodeHighlight(childName,inSelection) {
        let childComponentDisplay = this.getChildComponentDisplay(childName);
        if(childComponentDisplay) childComponentDisplay.setHighlight(inSelection); 
    }
    

    /** This should be called by the parent component when it is discarding the 
     * page display.  
     * @protected */
    destroy() {
        //we should probably have a less cumbesome way of doing this
        let pageComponent = this.componentView.getComponent();
        let folder = pageComponent.getParentFolderForChildren();
        var childIdMap = folder.getChildIdMap();
        var modelView = this.componentView.getModelView();
        var modelManager = modelView.getModelManager();

        for(var childName in childIdMap) {
            var childMemberId = childIdMap[childName];
            var childComponentId = modelManager.getComponentIdByMemberId(childMemberId);
            var childComponentView = modelView.getComponentViewByComponentId(childComponentId);
            if(childComponentView) {
                childComponentView.closeComponentDisplay();
            }
        }

        if(this.tab) this.closeTab();
    }

    /** @protected */
    tabShown() {
        this.isShowing = true;
        if(this.editorView) {
            this.editorView.focus();
            if(this.editorView.state) {
                let tr = this.editorView.state.tr;
                tr.scrollIntoView();
                setTimeout(() => this.editorView.dispatch(tr),0);
            }
        }
        this.dispatchEvent(uiutil.SHOWN_EVENT,this);
    }

    /** @protected */
    tabHidden() {
        this.isShowing = false;
        this.dispatchEvent(uiutil.HIDDEN_EVENT,this);
    }

    tabClosed() {
        //delete the page
        this.componentView.closeTabDisplay();
        this.dispatchEvent(uiutil.CLOSE_EVENT,this);
    }
    
}

//add mixins to this class
apogeeutil.mixin(LiteratePageComponentDisplay,EventManager);

/** This is the data to load an empty page. */
LiteratePageComponentDisplay.EMPTY_PAGE_BODY = [];
