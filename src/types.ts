export interface AppStoreConnectConfig {
  keyId: string;
  issuerId: string;
  privateKeyPath: string;
}

export interface App {
  id: string;
  type: string;
  attributes: {
    name: string;
    bundleId: string;
    sku: string;
    primaryLocale: string;
  };
}

export interface ListAppsResponse {
  data: App[];
}

export interface BetaGroup {
  id: string;
  type: string;
  attributes: {
    name: string;
    isInternalGroup: boolean;
    publicLinkEnabled: boolean;
    publicLinkId?: string;
    publicLinkLimit?: number;
    createdDate: string;
  };
}

export interface BetaTester {
  id: string;
  type: string;
  attributes: {
    firstName: string;
    lastName: string;
    email: string;
    inviteType: string;
    betaGroups?: BetaGroup[];
  };
}

export interface ListBetaGroupsResponse {
  data: BetaGroup[];
}

export interface ListBetaTestersResponse {
  data: BetaTester[];
}

export interface AddTesterRequest {
  data: {
    type: "betaTesters";
    attributes: {
      email: string;
      firstName: string;
      lastName: string;
    };
    relationships: {
      betaGroups: {
        data: Array<{
          id: string;
          type: "betaGroups";
        }>;
      };
    };
  };
}

export interface CustomerReview {
  id: string;
  type: string;
  attributes: {
    rating: number;
    title: string;
    body: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
    response?: CustomerReviewResponse;
  };
}

export interface CustomerReviewResponse {
  responseBody: string;
  lastModifiedDate: string;
  state: string;
  review: string;
}

export interface ListCustomerReviewsResponse {
  data: CustomerReview[];
  included?: CustomerReviewResponse[];
  meta?: any;
  links?: any;
}

export interface CustomerReviewResponseCreateRequest {
  data: {
    type: "customerReviewResponses";
    attributes: {
      responseBody: string;
    };
    relationships: {
      review: {
        data: {
          id: string;
          type: "customerReviews";
        };
      };
    };
  };
}

export interface CustomerReviewResponseV1Response {
  data: CustomerReviewResponse;
  included?: any[];
  links?: any;
  meta?: any;
}
