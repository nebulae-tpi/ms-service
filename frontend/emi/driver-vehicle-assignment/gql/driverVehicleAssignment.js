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
      # blocks{
      #   key
      # }
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
  query ServiceDrivers($filterInput: ServiceVehicleAssignmentFilterInput!, $paginationInput: PaginationInput!) {
    ServiceDrivers(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      businessId
      name
      lastname
      username
      active
      # blocks
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
  query ServiceDriversSize($filterInput: ServiceVehicleAssignmentFilterInput!) {
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
      # blocks
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

export const ServiceUnassignVehicleToDriver = gql `
  mutation ServiceUnassignVehicleToDriver($driverId: String!, $vehiclePlate: String!){
    ServiceUnassignVehicleToDriver(driverId: $driverId, vehiclePlate: $vehiclePlate){
      code
      message
    }
  }
`;

// SUBSCRIPTION
export const ServiceDriverVehicleAssignedSubscription = gql`
  subscription($driverId: String){
    ServiceDriverVehicleAssignedSubscription(driverId: $driverId){    
      _id
      businessId
      licensePlate
      active
      # blocks{
      #   key
      # }
      brand
      line
      model
      fuelType
      features
    }
  }
`;

