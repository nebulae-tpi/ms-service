import gql from "graphql-tag";

// FRAGMENTS
export const ServiceServiceFieldsFragment = gql`
    fragment ServiceServiceFieldsFragment on ServiceService {
      _id
      businessId
      shiftId
      timestamp
      requestedFeatures 
      pickUp {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
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
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      pickUpETA
      dropOffETA
      verificationCode
      paymentType
      fareDiscount
      fare
      state
      stateChanges {
        state
        timestamp
        location {
          lat
          lng
          timestamp
        }
        notes
      }
      location {
        lat
        lng
        timestamp
      }      
      vehicle {
        licensePlate
      }
      driver {
        documentId
        fullname
      }
      client {
        # id
        businessId
        username
        fullname
        tip
        tipType
      }
      tip      
      route {
        lat
        lng
        timestamp
      }
      lastModificationTimestamp      
    }
  `;

// We use the gql tag to parse our query string into a query document
export const ServiceService = gql`
  query ServiceService($id: String!) {
    ServiceService(id: $id) {
      _id
      businessId
      shiftId
      timestamp
      requestedFeatures 
      pickUp {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
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
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      pickUpETA
      dropOffETA
      verificationCode
      paymentType
      fareDiscount
      fare
      state
      stateChanges {
        state
        timestamp
        location {
          lat
          lng
          timestamp
        }
        notes
      }
      location {
        lat
        lng
        timestamp
      }      
      vehicle {
        licensePlate
      }
      driver {
        documentId
        fullname
      }
      client {
        # id
        businessId
        username
        fullname
        tip
        tipType
      }
      tip      
      route {
        lat
        lng
        timestamp
      }
      lastModificationTimestamp 
    }
  }
`;

export const ServiceServices = gql`
  query ServiceServices($filterInput: ServiceServiceFilterInput!, $paginationInput: ServiceServicePaginationInput!) {
    ServiceServices(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      businessId
      shiftId
      timestamp
      requestedFeatures 
      pickUp {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
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
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      pickUpETA
      dropOffETA
      verificationCode
      paymentType
      fareDiscount
      fare
      state
      stateChanges {
        state
        timestamp
        location {
          lat
          lng
          timestamp
        }
        notes
      }
      location {
        lat
        lng
        timestamp
      }      
      vehicle {
        licensePlate
      }
      driver {
        documentId
        fullname
      }
      client {
        # this field cant be featched due at bug in apollo client https://github.com/apollographql/apollo-client/issues/3903
        # id, 
        businessId
        username
        fullname
        tip
        tipType
      }
      tip      
      route {
        lat
        lng
        timestamp
      }
      lastModificationTimestamp 
    }
  }
`;

export const ServiceServicesSize = gql`
  query ServiceServicesSize($filterInput: ServiceServiceFilterInput!) {
    ServiceServicesSize(filterInput: $filterInput)
  }
`;

// SUBSCRIPTION
export const ServiceServiceUpdatedSubscription = gql`
  subscription{
    ServiceServiceUpdatedSubscription{
      _id
      businessId
      shiftId
      timestamp
      requestedFeatures 
      pickUp {
        marker {
          lat
          lng
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
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
          timestamp
        }
        polygon {
          lat
          lng
          timestamp
        }
        city
        zone
        neighborhood
        addressLine1
        addressLine2
        notes
      }
      pickUpETA
      dropOffETA
      verificationCode
      paymentType
      fareDiscount
      fare
      state
      stateChanges {
        state
        timestamp
        location {
          lat
          lng
          timestamp
        }
        notes
      }
      location {
        lat
        lng
        timestamp
      }      
      vehicle {
        licensePlate
      }
      driver {
        documentId
        fullname
      }
      client {
        # id
        businessId
        username
        fullname
        tip
        tipType
      }
      tip      
      route {
        lat
        lng
        timestamp
      }
      lastModificationTimestamp 
    }
  }
`;
