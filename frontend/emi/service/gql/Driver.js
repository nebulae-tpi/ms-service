import gql from "graphql-tag";

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