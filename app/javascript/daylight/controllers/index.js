import { application } from "daylight/controllers/application"

import AutoRefreshController from "daylight/controllers/auto_refresh_controller"
import BulkSelectController from "daylight/controllers/bulk_select_controller"
import ChartController from "daylight/controllers/chart_controller"
import ColorSchemeController from "daylight/controllers/color_scheme_controller"
import CopyController from "daylight/controllers/copy_controller"
import DialogController from "daylight/controllers/dialog_controller"
import FilterFormController from "daylight/controllers/filter_form_controller"
import PollController from "daylight/controllers/poll_controller"
import SheetController from "daylight/controllers/sheet_controller"
import TabsController from "daylight/controllers/tabs_controller"
import ToggleClassController from "daylight/controllers/toggle_class_controller"

application.register("auto-refresh", AutoRefreshController)
application.register("bulk-select", BulkSelectController)
application.register("chart", ChartController)
application.register("color-scheme", ColorSchemeController)
application.register("copy", CopyController)
application.register("dialog", DialogController)
application.register("filter-form", FilterFormController)
application.register("poll", PollController)
application.register("sheet", SheetController)
application.register("tabs", TabsController)
application.register("toggle-class", ToggleClassController)
