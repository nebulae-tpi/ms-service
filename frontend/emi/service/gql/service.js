import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document
export const ServiceService = gql`
  query ServiceService($id: String!) {
    ServiceService(id: $id) {
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const ServiceServices = gql`
  query ServiceServices($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    ServiceServices(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const ServiceServicesSize = gql`
  query ServiceServicesSize($filterInput: FilterInput!) {
    ServiceServicesSize(filterInput: $filterInput)
  }
`;

// SUBSCRIPTION
export const ServiceServiceUpdatedSubscription = gql`
  subscription{
    ServiceServiceUpdatedSubscription{
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
