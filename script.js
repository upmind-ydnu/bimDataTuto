import * as BIMDataViewer from 'https://cdn.jsdelivr.net/npm/@bimdata/viewer';

    const model1 = { mode:"3d", cloudId: 22883, projectId: 578666, modelIds: [1068673], accessToken: "RzITkybxGmPU4WLLf956fy55AlhTd92F"}

    let viewer = makeBIMDataViewer({
        api: {
            modelIds: model1.modelIds,
            cloudId: model1.cloudId,
            projectId: model1.projectId,
            accessToken: model1.accessToken,
        },
        ui: {
            version: false,
            bimdataLogo: false,
            menuVisible: false,
        },
        plugins: {
            bcf: false,
            fullscreen: true,
            projection: false,
            search: false,
            section: false,
            "structure-properties": false,
            viewer2d: true,
            "viewer2d-background": false,
            "viewer2d-drawer": false,
            "viewer2d-parameters": true,
            "viewer2d-screenshot": false,
            "window-split": false,
        }
    });

    const annotationPluginTemplate = `
            <div>
                <BIMDataInput
                    v-model="message"
                    placeholder="write annotation text"
                ><BIMDataInput>
            </div>
        `
    
    // const modifyAnnotationComponent = 

    const errorModalComponent = {
        props: {
            textContent: {
                type: String,
                default: 'Annotations should have text'
            }
        },
        name: "Component_modal",
        template: `
            <div
                style="
                    height: 100%;
                    width: 100%;
                    background: darkgray;
                    padding: 2rem;
                    border-radius: var(--modal-border-radius);
                    color: white;
                    "
            >
                {{ textContent }}
            </div>
        `,
    };

    const annotationComponent = (data) => ({
        data() {
            return {
                showAnnotationText : false,
                editMode : false,
                message : data.message,
                index : data.index
            }
        },
        name: "Annotation_component",
        template: `
            <div>
                <div
                    @click="onClick"
                    @contextmenu="onContextMenu"
                    style="
                        background: red;
                        width: 2rem;
                        height: 2rem;
                        border-radius: 100%;
                    "
                >
                </div>
                <div 
                    v-if="showAnnotationText"    
                >
                    <div 
                        class="annotationText"
                        @dblclick="onDoubleClick"
                    > {{ message }}</div>
                </div>
                <div 
                    v-if="editMode"    
                >
                    <input
                        ref="inputField"
                        @keyup.enter="onEnterKeyPress"
                        @blur="onBlur"
                        :value="message"
                        class="annotationText"
                    ></input>
                </div>
            </div>
        `,
        methods: {
            onClick() {
                this.editMode = false;
                this.showAnnotationText = !this.showAnnotationText
            },
            onDoubleClick() {
                this.editMode = true;
                this.showAnnotationText = false;
                this.$nextTick(() => {
                    this.$refs.inputField.select();
                    this.$refs.inputField.focus();
                });
            },
            onBlur() {
                this.editMode = false;
                this.showAnnotationText = true;
                const annotationPlugin = this.$viewer.localContext.getPlugin("annotationPlugin")
                annotationPlugin.$close();
            },
            onEnterKeyPress(e) {
                this.message = e.target.value;
                this.editMode = false;
                this.showAnnotationText = true;
            },
            onContextMenu() {
                this.$viewer.contextMenu.preventDefault();
                this.$viewer.contextMenu.registerContextCommand({
                    label: "Delete annotation",
                    execute: () => {
                        const { annotations } = this.$viewer.state
                        const annotationIndex = annotations.findIndex(annotation => annotation.props.index === data.index)  
                        this.$viewer.state.removeAnnotation(annotations[annotationIndex])
                    },
                });
            }
        }
    })

    const annotationPluginComponent = {
        name: "annotationPluginComponent",
        template: annotationPluginTemplate,
        data() {
            return {
                message: '',
                annotationNb: 0,
            };
        },
        mounted() {
            this.currentViewer = this.$viewer.localContext.getPlugin("viewer2d");
        },
        onClose() {
            // reinitializes the message after each plugin close
            this.message = '';
            this.currentViewer.stopAnnotationMode()
        },
        onOpen() {
            this.currentViewer.startAnnotationMode((data) => {
                const {x, y, z} = data;
                if(!this.message) {
                    this.$viewer.localContext.modals.pushModal(errorModalComponent);
                    setTimeout(() => 
                        this.$viewer.localContext.modals.clearModal()
                    , 2000);
                    return;
                }
                this.$viewer.state.addAnnotation({
                    component: annotationComponent({message: this.message, index: this.annotationNb}),
                    props: {
                        index: this.annotationNb
                    },
                    x,
                    y,
                    z,
                })
                this.annotationNb += 1
                // reinitializes the message after each annotation creation
                this.message = '';
            });
        },
    };

    const annotationPlugin = () => ({
        name: "annotationPlugin",
        component : annotationPluginComponent,
        addToWindows: ["2d"],
        button: {
            position: "left",
            content: "simple",
            keepOpen: true,
            tooltip: "Write an annotation",
        },
    })

    viewer.registerPlugin(annotationPlugin());

    viewer.mount("#viewerId", "2d");