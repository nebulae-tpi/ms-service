import gql from "graphql-tag";

// MUTATIONS 
export const IOERequestService = gql`
  mutation IOERequestService($client: IOEClientInput!, $pickUp: IOELocationInput!, $paymentType: String!, $requestedFeatures: [String], $dropOff: IOELocationInput, $dropOffSpecialType: String, $fareDiscount: Float, $fare: Int, $tip: Int, $request: RequestInput){
    IOERequestService(client: $client, pickUp: $pickUp, paymentType: $paymentType, requestedFeatures: $requestedFeatures, dropOff: $dropOff, dropOffSpecialType: $dropOffSpecialType, fareDiscount: $fareDiscount, fare: $fare, tip: $tip,  request: $request){
      accepted
    }
  }
`;

export const IOECancelService = gql`
  mutation IOECancelService($id: String!, $reason: String!, $authorType: String!, $notes: String){
    IOECancelService(id: $id, reason: $reason, authorType: $authorType, notes: $notes){
      accepted
    }
  }
`;

export const IOEServices = gql`
query IOEServices($serviceStatesFilter: [String], $serviceChannelsFilter: [String], $viewAllOperators: Boolean, $page: Int, $pageCount: Int, $projections: [String]){
  IOEServices(serviceStatesFilter: $serviceStatesFilter, serviceChannelsFilter : $serviceChannelsFilter, viewAllOperators: $viewAllOperators, page: $page, pageCount: $pageCount, projections: $projections){
    id,
    closed,
      businessId,
      shiftId,
      timestamp,
      requestedFeatures,
      client{
      id,
        businessId,
        fullname,
        username,
        tip,
        tipType,
        referrerDriverDocumentId,
        offerMinDistance,
        offerMaxDistance,      
    },
    pickUp{
      marker{ lat, lng, timestamp },
      city,
        zone,
        neighborhood,
        addressLine1,
        addressLine2,
        notes
    },
    dropOffSpecialType,
      verificationCode,
      pickUpETA,
      dropOffpETA,
      paymentType,
      fareDiscount,
      fare,
      tip,
      route{ lat, lng, timestamp },
    state,
    stateChanges{ state, timestamp, location{ lat, lng, timestamp }, notes },
    location{ lat, lng, timestamp },
    vehicle{
      licensePlate
    },
    driver{ fullname, document, id },
    lastModificationTimestamp,
      request{
      sourceChannel, destChannel,
        creationOperatorId, creationOperatorUsername,
        ownerOperatorId, ownerOperatorUsername
    }
  }
}
`;

// SUBSCRIPTION
export const IOEServiceSubscription = gql`
  subscription($businessId: String, $operatorId: String){
    IOEService(businessId: $businessId, operatorId: $operatorId){    
      id,
      closed,
        businessId,
        shiftId,
        timestamp,
        requestedFeatures,
        client{
        id,
          businessId,
          fullname,
          username,
          tip,
          tipType,
          referrerDriverDocumentId,
          offerMinDistance,
          offerMaxDistance,      
      },
      pickUp{
        marker{ lat, lng, timestamp },
        city,
          zone,
          neighborhood,
          addressLine1,
          addressLine2,
          notes
      },
      dropOffSpecialType,
        verificationCode,
        pickUpETA,
        dropOffpETA,
        paymentType,
        fareDiscount,
        fare,
        tip,
        route{ lat, lng, timestamp },
      state,
      stateChanges{ state, timestamp, location{ lat, lng, timestamp }, notes },
      location{ lat, lng, timestamp },
      vehicle{
        licensePlate
      },
      driver{ fullname, document, id },
      lastModificationTimestamp,
        request{
        sourceChannel, destChannel,
          creationOperatorId, creationOperatorUsername,
          ownerOperatorId, ownerOperatorUsername
      }
    }
  }
`;