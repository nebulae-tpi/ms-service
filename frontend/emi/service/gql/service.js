import gql from "graphql-tag";

// FRAGMENTS
export const ServiceServiceFieldsFragment = gql`
    fragment ServiceServiceFieldsFragment on ServiceService {
      _id
      requestTimestamp
      client {
        name
      }
      driver {
        driverId
        name
        documentType
        documentId
        username
      }
      vehicle {
        vehicleId
        licensePlate
        model
        brand
        line
      }
      pickUp {
        marker {
          lat
          lng
        }
        polygon {
          lat
          lng
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      dropOff {
        marker {
          lat
          lng
        }
        polygon {
          lat
          lng
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      verificationCode
      requestedFeatures
      paymentType
      fareDiscount
      fare
      route {
        lat
        lng
      }
      state
      businessId
    }
  `;

// We use the gql tag to parse our query string into a query document
export const ServiceService = gql`
  query ServiceService($id: String!) {
    ServiceService(id: $id) {
      ...${ServiceServiceFieldsFragment}
    }
    ${ServiceServiceFieldsFragment}
  }
`;

export const ServiceServices = gql`
  query ServiceServices($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    ServiceServices(filterInput: $filterInput, paginationInput: $paginationInput) {
      ...${ServiceServiceFieldsFragment}
    }
    ${ServiceServiceFieldsFragment}
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
      ...${ServiceServiceFieldsFragment}
    }
    ${ServiceServiceFieldsFragment}
  }
`;
