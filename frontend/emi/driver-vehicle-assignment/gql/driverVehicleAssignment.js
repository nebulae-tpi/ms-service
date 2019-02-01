import gql from "graphql-tag";
export const ServiceDriver = gql`
  query ServiceDriver($id: String!) {
    ServiceDriver(id: $id) {
      _id
      businessId
      name
      lastname
      username
      active
      blocks
      documentType
      documentId
      pmr
      languages
      phone
      assignedVehicles
    }
  }
`;

export const ServiceDrivers = gql`
  query ServiceDrivers($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    ServiceDrivers(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      businessId
      name
      lastname
      username
      active
      blocks
      documentType
      documentId
      pmr
      languages
      phone
      assignedVehicles
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
      _id
      businessId
      licensePlate
      active
      blocks
      brand
      line
      model
      fuelType
      features
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

export const ServiceAssignVehicleToDriver = gql `
  mutation ServiceAssignVehicleToDriver($driverId: String!, $vehiclePlate: String!){
    ServiceAssignVehicleToDriver(driverId: $driverId, vehiclePlate: $vehiclePlate){
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
      businessId
      name
      lastname
      username
      active
      blocks
      documentType
      documentId
      pmr
      languages
      phone
      assignedVehicles
    }
  }
`;

