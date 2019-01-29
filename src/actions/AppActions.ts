/* Copyright 2018 Mozilla Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import dispatcher from "../dispatcher";
import { File, Directory, Project } from "../models";
import { Template } from "../components/NewProjectDialog";
import { View, ViewType } from "../components/editor/View";
import appStore from "../stores/AppStore";
import { Service } from "../service";
import Group from "../utils/group";
import { Errors } from "../errors";
import { runTask as runGulpTask, RunTaskExternals } from "../utils/taskRunner";
import getConfig from "../config";

export enum AppActionType {
  ADD_FILE_TO = "ADD_FILE_TO",
  LOAD_PROJECT = "LOAD_PROJECT",
  CLEAR_PROJECT_MODIFIED = "CLEAR_PROJECT_MODIFIED",
  INIT_STORE = "INIT_STORE",
  UPDATE_FILE_NAME_AND_DESCRIPTION = "UPDATE_FILE_NAME_AND_DESCRIPTION",
  DELETE_FILE = "DELETE_FILE",
  SPLIT_GROUP = "SPLIT_GROUP",
  SET_VIEW_TYPE = "SET_VIEW_TYPE",
  OPEN_FILE = "OPEN_FILE",
  OPEN_FILES = "OPEN_PROJECT_FILES",
  FOCUS_TAB_GROUP = "FOCUS_TAB_GROUP",
  LOG_LN = "LOG_LN",
  CLEAR_LOG = "CLEAR_LOG",
  PUSH_STATUS = "PUSH_STATUS",
  POP_STATUS = "POP_STATUS",
  SANDBOX_RUN = "SANDBOX_RUN",
  CLOSE_VIEW = "CLOSE_VIEW",
  CLOSE_TABS = "CLOSE_TABS",
  OPEN_VIEW = "OPEN_VIEW",
}

export interface AppAction {
  type: AppActionType;
}

export interface AddFileToAction extends AppAction {
  type: AppActionType.ADD_FILE_TO;
  file: File;
  parent: Directory;
}

export function addFileTo(file: File, parent: Directory) {
  dispatcher.dispatch({
    type: AppActionType.ADD_FILE_TO,
    file,
    parent,
  } as AddFileToAction);
}

export interface LoadProjectAction extends AppAction {
  type: AppActionType.LOAD_PROJECT;
  project: Project;
}

export function loadProject(project: Project) {
  dispatcher.dispatch({
    type: AppActionType.LOAD_PROJECT,
    project,
  } as LoadProjectAction);
}

export function initStore() {
  dispatcher.dispatch({
    type: AppActionType.INIT_STORE,
  } as AppAction);
}

export interface UpdateFileNameAndDescriptionAction extends AppAction {
  type: AppActionType.UPDATE_FILE_NAME_AND_DESCRIPTION;
  file: File;
  name: string;
  description: string;
}

export function updateFileNameAndDescription(file: File, name: string, description: string) {
  dispatcher.dispatch({
    type: AppActionType.UPDATE_FILE_NAME_AND_DESCRIPTION,
    file,
    name,
    description,
  } as UpdateFileNameAndDescriptionAction);
}

export interface DeleteFileAction extends AppAction {
  type: AppActionType.DELETE_FILE;
  file: File;
}

export function deleteFile(file: File) {
  dispatcher.dispatch({
    type: AppActionType.DELETE_FILE,
    file,
  } as DeleteFileAction);
}

export interface LogLnAction extends AppAction {
  type: AppActionType.LOG_LN;
  message: string;
  kind: ("" | "info" | "warn" | "error");
}

export type logKind = "" | "info" | "warn" | "error";

export function logLn(message: string, kind: logKind = "") {
  dispatcher.dispatch({
    type: AppActionType.LOG_LN,
    message,
    kind,
  } as LogLnAction);
}

export interface ClearLogAction extends AppAction {
  type: AppActionType.CLEAR_LOG;
}

export function clearLog() {
  dispatcher.dispatch({
    type: AppActionType.CLEAR_LOG,
  } as ClearLogAction);
}

export interface SplitGroupAction extends AppAction {
  type: AppActionType.SPLIT_GROUP;
}

export function splitGroup() {
  dispatcher.dispatch({
    type: AppActionType.SPLIT_GROUP
  } as SplitGroupAction);
}

export interface OpenViewAction extends AppAction {
  type: AppActionType.OPEN_VIEW;
  view: View;
  preview: boolean;
}

export function openView(view: View, preview = true) {
  dispatcher.dispatch({
    type: AppActionType.OPEN_VIEW,
    view,
    preview
  } as OpenViewAction);
}

export interface CloseViewAction extends AppAction {
  type: AppActionType.CLOSE_VIEW;
  view: View;
}

export function closeView(view: View) {
  dispatcher.dispatch({
    type: AppActionType.CLOSE_VIEW,
    view
  } as CloseViewAction);
}

export interface CloseTabsAction extends AppAction {
  type: AppActionType.CLOSE_TABS;
  file: File;
}

export function closeTabs(file: File) {
  dispatcher.dispatch({
    type: AppActionType.CLOSE_TABS,
    file
  } as CloseTabsAction);
}

export interface OpenFileAction extends AppAction {
  type: AppActionType.OPEN_FILE;
  file: File;
  viewType: ViewType;
  preview: boolean;
  // TODO: Add the location where the file should open.
}

export function openFile(file: File, type: ViewType = ViewType.Editor, preview = true) {
  dispatcher.dispatch({
    type: AppActionType.OPEN_FILE,
    file,
    viewType: type,
    preview
  } as OpenFileAction);
}

export function openFiles(files: string[][]) {
  dispatcher.dispatch({
    type: AppActionType.OPEN_FILES,
    files
  } as OpenFilesAction);
}

export interface OpenFilesAction extends AppAction {
  type: AppActionType.OPEN_FILES;
  files: string[][];
}

export async function openProjectFiles(template: Template) {
  const newProject = new Project();
  await Service.loadFilesIntoProject(template.files, newProject, template.baseUrl);
  dispatcher.dispatch({
    type: AppActionType.LOAD_PROJECT,
    project: newProject
  } as LoadProjectAction);
  if (newProject.getFile("README.md")) {
    openFiles([["README.md"]]);
  }
}

export async function saveProject(fiddle: string): Promise<string> {
  const tabGroups = appStore.getTabGroups();
  const projectModel = appStore.getProject().getModel();

  const openedFiles = tabGroups.map((group) => {
    return group.views.map((view) => view.file.getPath());
  });

  pushStatus("Saving Project ...");
  try {
    const uri = await Service.saveProject(projectModel, openedFiles, fiddle);
    dispatcher.dispatch({
      type: AppActionType.CLEAR_PROJECT_MODIFIED,
    } as AppAction);
    return uri;
  } finally {
    popStatus();
  }
}

export interface FocusTabGroupAction extends AppAction {
  type: AppActionType.FOCUS_TAB_GROUP;
  group: Group;
}

export function focusTabGroup(group: Group) {
  dispatcher.dispatch({
    type: AppActionType.FOCUS_TAB_GROUP,
    group
  } as FocusTabGroupAction);
}

export interface PushStatusAction extends AppAction {
  type: AppActionType.PUSH_STATUS;
  status: string;
}

export interface PopStatusAction extends AppAction {
  type: AppActionType.POP_STATUS;
}

export function pushStatus(status: string) {
  dispatcher.dispatch({
    type: AppActionType.PUSH_STATUS,
    status,
  } as PushStatusAction);
}

export function popStatus() {
  dispatcher.dispatch({
    type: AppActionType.POP_STATUS,
  } as PopStatusAction);
}

export async function runTask(
  name: string,
  optional: boolean = false,
  externals: RunTaskExternals = RunTaskExternals.Default
) {
  // Runs the provided source in our fantasy gulp context
  const run = async (src: string) => {
    const project = appStore.getProject().getModel();
    return await runGulpTask(src, name, optional, project, logLn, externals);
  };
  let gulpfile = appStore.getFileByName("gulpfile.js");
  if (gulpfile) {
    return await run(appStore.getFileSource(gulpfile));
  } else {
    if (gulpfile = appStore.getFileByName("build.ts")) {
      const output = await gulpfile.getModel().getEmitOutput();
      return await run(output.outputFiles[0].text);
    } else {
      if (gulpfile = appStore.getFileByName("build.js")) {
        return await run(appStore.getFileSource(gulpfile));
      } else {
        logLn(Errors.BuildFileMissing, "error");
        return false;
      }
    }
  }
}

export async function deploy(fiddleName: string, contractSuffix: string = "") {
  const mainFileName = "out/main.wasm";
  const projectModel = appStore.getProject().getModel();
  pushStatus("Deploying Contract");
  await Service.deployContract(fiddleName, projectModel.getFile(mainFileName), this, contractSuffix);
  popStatus();
  projectModel.getFile(mainFileName);
}

export async function deployAndRun(fiddleName: string) {
  const config = await getConfig();
  // NOTE: Page opened beforehand to avoid popup blocking
  const page = window.open("about:blank", "pageDevWindow");
  // TODO: Show something better than empty window, e.g. stream compiler output?
  clearLog();
  if (await build()) {
    await deploy(fiddleName);
    page.location.replace(`${config.pages}/${fiddleName}/`);
  } else {
    page.close();
  }
}

export async function build() {
  pushStatus("Building Project");
  const buildSucceeded = await runTask("build");
  popStatus();
  return buildSucceeded;
}

export async function deployAndRunTests(fiddleName: string) {
  const config = await getConfig();
  const page = window.open("about:blank", "pageDevWindow");
  if (await build()) {
    await deploy(fiddleName, "test");
    page.location.replace(`${config.pages}/${fiddleName}/test.html`);
  } else {
    page.close();
  }
}

export interface SetViewType extends AppAction {
  type: AppActionType.SET_VIEW_TYPE;
  view: View;
  viewType: ViewType;
}

export function setViewType(view: View, type: ViewType) {
  dispatcher.dispatch({
    type: AppActionType.SET_VIEW_TYPE,
    view,
    viewType: type
  } as SetViewType);
}

export async function createAccount(newAccountId: string, newAccountKey: string) {
  const createAccountResponse = await Service.createAccount(newAccountId, newAccountKey, this);
  return createAccountResponse;
}
