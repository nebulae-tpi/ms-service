import gql from "graphql-tag";


// We use the gql tag to parse our query string into a query document
export const ServiceShift = gql`
  query ServiceShift($id: String!) {
    ServiceShift(id: $id) {
      _id
      businessId
      timestamp
      state
      online
      lastReceivedComm
      location {
        type
        coordinates
      }
      driver {
        id
        fullname
        blocks
        documentType
        pmr
        languages
        phone
        username
      }
      vehicle {
        id
        licensePlate
        blocks
        features
        brand
        line
        model
      }
    }
  }
`;

export const ServiceShifts = gql`
  query ServiceShifts($filterInput: ServiceShiftFilterInput!, $paginationInput: ServiceShiftPaginationInput!) {
    ServiceShifts(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      businessId
      timestamp
      state
      online
      lastReceivedComm
      location {
        type
        coordinates
      }
      driver {
        id
        fullname
        blocks
        documentType
        pmr
        languages
        phone
        username
      }
      vehicle {
        id
        licensePlate
        blocks
        features
        brand
        line
        model
      }
    }
  }
`;

export const ServiceShiftsSize = gql`
  query ServiceShiftsSize($filterInput: ServiceShiftFilterInput!) {
    ServiceShiftsSize(filterInput: $filterInput)
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
        id
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
