export const locale = {
  lang: 'en',
  data: {
    DRIVER: {
      DETAIL_HEADER_NAME: 'DRIVER',
      DETAIL_HEADER_NEW: 'New driver',
      TITLE: 'Driver',
      FILTER: 'Filter',
      NAME: 'Name',
      LASTNAME: 'Lastname',
      VEHICLE_QTY: 'Assigned Vehicles',
      DOCUMENT_ID: 'Person ID',
      PERSON_ID: 'Person ID',
      CREATION_DATE: 'Creation date',
      CREATOR_USER: 'Creator user',
      RESET_FILTER: 'Reset filter',
      FILTER_SELECTED_BUSINESS: 'Filter by selected business unit',
      CREATION_TIMESTAMP: 'Created',
      LAST_MODIFICATION_TIMESTAMP: 'Modified',
      MODIFIER_USER: 'User who modified',
      ADD_NEW: 'Add new',
      VEHICLE: {
        LICENSE_PLATE: 'Identifier',
        MODEL: 'Model',
        FUEL_TYPE: 'Fuel type',
        BRAND: 'Brand',
        ACTIVE: 'Active',
        ACTIONS: 'Actions',
        FUEL_TYPES: {
          GASOLINE: 'Gasoline',
          GAS: 'Gas',
          GASOLINE_AND_GAS: 'Gasoline and Gas',
          GAS_AND_GASOLINE: 'Gas and Gasoline',
          DIESEL: 'Diesel',
          ELECTRIC: 'Electricity',
          null : 'Not specified'
        }
      },
      LICENSE_PLATE: 'Identifier',
      DETAILS: {
        TABS: {
          GENERAL_INFO: 'General Info'
        },
        GENERAL_INFO: 'General Info',
        ENABLED: 'Enabled',
        DISABLED: 'Disabled',
        NAME: 'Name',
        DESCRIPTION: 'Description'

      },
      ACTIVE: 'Active',
      CREATE: 'Create',
      UPDATE: 'Save',
      UPDATE_TITLE: 'Update',
      UPDATE_MESSAGE: 'Are you sure you want to make the modification?',
      CREATE_TITLE: 'Creation',
      CREATE_MESSAGE: '¿Are you sure you want to make the creation?',
      CANCEL: 'Cancel',
      ENTITY_UPDATED: 'Element updated',
      ENTITY_CREATED: 'Element created',
      CLOSE: 'Close',
      WAIT_OPERATION: 'Operation in process, in case of not receiving an answer, verify if the changes made were applied successfully.',
      SELECT_BUSINESS: 'You must select a business unit before performing the creation.',
      ERROR_OPERATION: 'Error performing operation',
      VEHICLE_ASSIGNED: 'Vehicle assigned',
      VEHICLE_UNASSIGNED: 'Vehicle unassigned',
    },
    ERRORS: {
      1: 'Internal server error',
      2: 'Permission denied',
      23011: 'vehicle id already belongs to this driver',
      23012: 'vehicle id do not exist in the system',
      23023: 'You can\'t assign vehicle because it\'s inactive '
    },
  }
};
