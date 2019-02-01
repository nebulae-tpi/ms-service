import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document
export const ServiceDriver = gql`
  query ServiceDriver($id: String!) {
    ServiceDriver(id: $id) {
      _id
      generalInfo {
        name
        lastname
        personId
      }
      state
      vehiclesAssignedQty
    }
  }
`;

export const ServiceDrivers = gql`
  query ServiceDrivers($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    ServiceDrivers(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      generalInfo {
        name
        lastname
        personId
      }
      state
      vehiclesAssignedQty
    }
  }
`;

export const ServiceDriversSize = gql`
  query ServiceDriversSize($filterInput: FilterInput!) {
    ServiceDriversSize(filterInput: $filterInput)
  }
`;

export const ServiceDriverVehicleList = gql`
  query ServiceDriverVehicleList($driverId: String!, $paginationInput: PaginationInput!) {
    ServiceDriverVehicleList(driverId: $driverId, paginationInput: $paginationInput ){
      licensePlate
      model
      fuelType
      brand
      active
    }
  }
`;

export const ServiceCreateDriver = gql `
  mutation ServiceCreateDriver($input: ServiceDriverInput!){
    ServiceCreateDriver(input: $input){
      code
      message
    }
  }
`;

export const ServiceUpdateDriverGeneralInfo = gql `
  mutation ServiceUpdateDriverGeneralInfo($id: ID!, $input: ServiceDriverGeneralInfoInput!){
    ServiceUpdateDriverGeneralInfo(id: $id, input: $input){
      code
      message
    }
  }
`;

export const ServiceUpdateDriverState = gql `
  mutation ServiceUpdateDriverState($id: ID!, $newState: Boolean!){
    ServiceUpdateDriverState(id: $id, newState: $newState){
      code
      message
    }
  }
`;

// SUBSCRIPTION
export const ServiceDriverUpdatedSubscription = gql`
  subscription{
    ServiceDriverUpdatedSubscription{
      _id
      generalInfo {
        name
        lastname
        personId
      }
      state
      vehiclesAssignedQty
    }
  }
`;

