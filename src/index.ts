#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';

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


// Load environment variables
const config: AppStoreConnectConfig = {
	keyId: process.env.APP_STORE_CONNECT_KEY_ID!,
	issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID!,
	privateKeyPath: process.env.APP_STORE_CONNECT_P8_PATH!,
};

// Validate required environment variables
if (!config.keyId || !config.issuerId || !config.privateKeyPath) {
	throw new Error(
		"Missing required environment variables. Please set: " +
		"APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_P8_PATH"
	);
}

class AppStoreConnectServer {
	private server: Server;
	private axiosInstance;

	constructor() {
		this.server = new Server({
			name: "appstore-connect-server",
			version: "1.0.0"
		}, {
			capabilities: {
				tools: {}
			}
		});

		this.axiosInstance = axios.create({
			baseURL: 'https://api.appstoreconnect.apple.com/v1',
		});

		this.setupHandlers();
	}

	private async generateToken(): Promise<string> {
		const privateKey = await fs.readFile(config.privateKeyPath, 'utf-8');

		const token = jwt.sign({}, privateKey, {
			algorithm: 'ES256',
			expiresIn: '20m', // App Store Connect tokens can be valid for up to 20 minutes
			audience: 'appstoreconnect-v1',
			keyid: config.keyId,
			issuer: config.issuerId,
		});

		return token;
	}

	private setupHandlers(): void {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "list_apps",
					description: "Get a list of all apps in App Store Connect",
					inputSchema: {
						type: "object",
						properties: {
							limit: {
								type: "number",
								description: "Maximum number of apps to return (default: 100)",
								minimum: 1,
								maximum: 200
							}
						}
					}
				},
				{
					name: "get_app_info",
					description: "Get detailed information about a specific app",
					inputSchema: {
						type: "object",
						properties: {
							appId: {
								type: "string",
								description: "The ID of the app to get information for"
							},
							include: {
								type: "array",
								items: {
									type: "string",
									enum: [
										"appClips",
										"appInfos",
										"appStoreVersions",
										"availableTerritories",
										"betaAppReviewDetail",
										"betaGroups",
										"betaLicenseAgreement",
										"builds",
										"endUserLicenseAgreement",
										"gameCenterEnabledVersions",
										"inAppPurchases",
										"preOrder",
										"prices",
										"reviewSubmissions"
									]
								},
								description: "Optional relationships to include in the response"
							}
						},
						required: ["appId"]
					}
				},
				{
					name: "list_users",
					description: "Get a list of all users registered on your App Store Connect team",
					inputSchema: {
						type: "object",
						properties: {
							limit: {
								type: "number",
								description: "Maximum number of users to return (default: 100, max: 200)",
								minimum: 1,
								maximum: 200
							},
							sort: {
								type: "string",
								description: "Sort order for the results",
								enum: [
									"username", "-username",
									"firstName", "-firstName",
									"lastName", "-lastName",
									"roles", "-roles"
								]
							},
							filter: {
								type: "object",
								properties: {
									username: {
										type: "string",
										description: "Filter by username"
									},
									roles: {
										type: "array",
										items: {
											type: "string",
											enum: [
												"ADMIN",
												"FINANCE",
												"TECHNICAL",
												"SALES",
												"MARKETING",
												"DEVELOPER",
												"ACCOUNT_HOLDER",
												"READ_ONLY",
												"APP_MANAGER",
												"ACCESS_TO_REPORTS",
												"CUSTOMER_SUPPORT"
											]
										},
										description: "Filter by user roles"
									},
									visibleApps: {
										type: "array",
										items: {
											type: "string"
										},
										description: "Filter by apps the user can see (app IDs)"
									}
								}
							},
							include: {
								type: "array",
								items: {
									type: "string",
									enum: ["visibleApps"],
									description: "Related resources to include in the response"
								}
							}
						}
					}
				},
				{
					name: "list_customer_reviews",
					description: "List all customer reviews for an app.",
					inputSchema: {
						type: "object",
						properties: {
							appId: {
								type: "string",
								description: "The ID of the app to get customer reviews for."
							},
							filterTerritory: {
								type: "array",
								items: { type: "string" },
								description: "Filter by territory (ISO country code)"
							},
							filterRating: {
								type: "array",
								items: { type: "string" },
								description: "Filter by rating (1-5)"
							},
							existsPublishedResponse: {
								type: "boolean",
								description: "Filter by published response existence"
							},
							sort: {
								type: "array",
								items: {
									type: "string",
									enum: ["rating", "-rating", "createdDate", "-createdDate"]
								},
								description: "Sort expressions"
							},
							fieldsCustomerReviews: {
								type: "array",
								items: {
									type: "string",
									enum: ["rating", "title", "body", "reviewerNickname", "createdDate", "territory", "response"]
								},
								description: "Fields to include for customerReviews"
							},
							fieldsCustomerReviewResponses: {
								type: "array",
								items: {
									type: "string",
									enum: ["responseBody", "lastModifiedDate", "state", "review"]
								},
								description: "Fields to include for customerReviewResponses"
							},
							limit: {
								type: "number",
								description: "Maximum resources per page (max 200)",
								maximum: 200
							},
							include: {
								type: "array",
								items: {
									type: "string",
									enum: ["response"]
								},
								description: "Relationships to include"
							}
						},
						required: ["appId"]
					}
				},
				{
					name: "list_customer_reviews_for_version",
					description: "List all customer reviews for a specific App Store Version.",
					inputSchema: {
						type: "object",
						properties: {
							versionId: {
								type: "string",
								description: "The ID of the App Store Version to get customer reviews for."
							},
							filterTerritory: {
								type: "array",
								items: { type: "string" },
								description: "Filter by territory (ISO country code)"
							},
							filterRating: {
								type: "array",
								items: { type: "string" },
								description: "Filter by rating (1-5)"
							},
							existsPublishedResponse: {
								type: "boolean",
								description: "Filter by published response existence"
							},
							sort: {
								type: "array",
								items: {
									type: "string",
									enum: ["rating", "-rating", "createdDate", "-createdDate"]
								},
								description: "Sort expressions"
							},
							fieldsCustomerReviews: {
								type: "array",
								items: {
									type: "string",
									enum: ["rating", "title", "body", "reviewerNickname", "createdDate", "territory", "response"]
								},
								description: "Fields to include for customerReviews"
							},
							fieldsCustomerReviewResponses: {
								type: "array",
								items: {
									type: "string",
									enum: ["responseBody", "lastModifiedDate", "state", "review"]
								},
								description: "Fields to include for customerReviewResponses"
							},
							limit: {
								type: "number",
								description: "Maximum resources per page (max 200)",
								maximum: 200
							},
							include: {
								type: "array",
								items: {
									type: "string",
									enum: ["response"]
								},
								description: "Relationships to include"
							}
						},
						required: ["versionId"]
					}
				},
				{
					name: "create_customer_review_response",
					description: "Create a response or replace an existing response you wrote to a customer review.",
					inputSchema: {
						type: "object",
						properties: {
							reviewId: {
								type: "string",
								description: "The ID of the customer review to respond to."
							},
							responseBody: {
								type: "string",
								description: "The response text to the customer review."
							}
						},
						required: ["reviewId", "responseBody"]
					}
				},
				{
					name: "delete_customer_review_response",
					description: "Delete a response to a customer review.",
					inputSchema: {
						type: "object",
						properties: {
							responseId: {
								type: "string",
								description: "The ID of the customer review response to delete."
							}
						},
						required: ["responseId"]
					}
				},
				{
					name: "get_customer_review_response",
					description: "Get the response to a specific customer review.",
					inputSchema: {
						type: "object",
						properties: {
							reviewId: {
								type: "string",
								description: "The ID of the customer review to get the response for."
							}
						},
						required: ["reviewId"]
					}
				}]
		}));

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
			try {
				const { name, arguments: args } = request.params;
				const token = await this.generateToken();

				switch (name) {
					case "list_apps":
						const response = await this.axiosInstance.get<ListAppsResponse>('/apps', {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params: {
								limit: request.params.arguments?.limit || 100
							}
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};

					case "list_beta_groups": {
						const response = await this.axiosInstance.get<ListBetaGroupsResponse>('/betaGroups', {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params: {
								limit: request.params.arguments?.limit || 100,
								// Include relationships to get more details
								include: 'app,betaTesters'
							}
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "get_app_info": {
						const { appId, include } = request.params.arguments as {
							appId: string;
							include?: string[];
						};

						if (!appId) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"appId is required"
							);
						}

						const response = await this.axiosInstance.get(`/apps/${appId}`, {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params: {
								include: include?.join(',')
							}
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "list_users": {
						interface ListUsersArgs {
							limit?: number;
							sort?: string;
							filter?: {
								username?: string;
								roles?: string[];
								visibleApps?: string[];
							};
							include?: string[];
						}

						const { limit = 100, sort, filter, include } = request.params.arguments as ListUsersArgs || {};

						const params: Record<string, any> = {
							limit: Math.min(Number(limit), 200)
						};

						// Add sort parameter if provided
						if (sort) {
							params.sort = sort;
						}

						// Add filters if provided
						if (filter) {
							if (filter.username) params['filter[username]'] = filter.username;
							if (filter.roles?.length) params['filter[roles]'] = filter.roles.join(',');
							if (filter.visibleApps?.length) params['filter[visibleApps]'] = filter.visibleApps.join(',');
						}

						// Add includes if provided
						if (Array.isArray(include) && include.length > 0) {
							params.include = include.join(',');
						}

						const response = await this.axiosInstance.get('/users', {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "list_customer_reviews": {
						const {
							appId,
							filterTerritory,
							filterRating,
							existsPublishedResponse,
							sort,
							fieldsCustomerReviews,
							fieldsCustomerReviewResponses,
							limit,
							include
						} = request.params.arguments as {
							appId: string;
							filterTerritory?: string[];
							filterRating?: string[];
							existsPublishedResponse?: boolean;
							sort?: string[];
							fieldsCustomerReviews?: string[];
							fieldsCustomerReviewResponses?: string[];
							limit?: number;
							include?: string[];
						};

						if (!appId) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"appId is required"
							);
						}

						const params: Record<string, any> = {};
						if (filterTerritory?.length) params["filter[territory]"] = filterTerritory.join(",");
						if (filterRating?.length) params["filter[rating]"] = filterRating.join(",");
						if (typeof existsPublishedResponse === "boolean") params["exists[publishedResponse]"] = existsPublishedResponse;
						if (sort?.length) params["sort"] = sort.join(",");
						if (fieldsCustomerReviews?.length) params["fields[customerReviews]"] = fieldsCustomerReviews.join(",");
						if (fieldsCustomerReviewResponses?.length) params["fields[customerReviewResponses]"] = fieldsCustomerReviewResponses.join(",");
						if (typeof limit === "number") params["limit"] = Math.min(Number(limit), 200);
						if (include?.length) params["include"] = include.join(",");

						const response = await this.axiosInstance.get(`/apps/${appId}/customerReviews`, {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "list_customer_reviews_for_version": {
						const {
							versionId,
							filterTerritory,
							filterRating,
							existsPublishedResponse,
							sort,
							fieldsCustomerReviews,
							fieldsCustomerReviewResponses,
							limit,
							include
						} = request.params.arguments as {
							versionId: string;
							filterTerritory?: string[];
							filterRating?: string[];
							existsPublishedResponse?: boolean;
							sort?: string[];
							fieldsCustomerReviews?: string[];
							fieldsCustomerReviewResponses?: string[];
							limit?: number;
							include?: string[];
						};

						if (!versionId) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"versionId is required"
							);
						}

						const params: Record<string, any> = {};
						if (filterTerritory?.length) params["filter[territory]"] = filterTerritory.join(",");
						if (filterRating?.length) params["filter[rating]"] = filterRating.join(",");
						if (typeof existsPublishedResponse === "boolean") params["exists[publishedResponse]"] = existsPublishedResponse;
						if (sort?.length) params["sort"] = sort.join(",");
						if (fieldsCustomerReviews?.length) params["fields[customerReviews]"] = fieldsCustomerReviews.join(",");
						if (fieldsCustomerReviewResponses?.length) params["fields[customerReviewResponses]"] = fieldsCustomerReviewResponses.join(",");
						if (typeof limit === "number") params["limit"] = Math.min(Number(limit), 200);
						if (include?.length) params["include"] = include.join(",");

						const response = await this.axiosInstance.get(`/appStoreVersions/${versionId}/customerReviews`, {
							headers: {
								'Authorization': `Bearer ${token}`
							},
							params
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "create_customer_review_response": {
						const { reviewId, responseBody } = request.params.arguments as { reviewId: string; responseBody: string };

						if (!reviewId || !responseBody) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"reviewId and responseBody are required"
							);
						}

						const body = {
							data: {
								type: "customerReviewResponses",
								attributes: {
									responseBody
								},
								relationships: {
									review: {
										data: {
											id: reviewId,
											type: "customerReviews"
										}
									}
								}
							}
						};

						const response = await this.axiosInstance.post('/customerReviewResponses', body, {
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json'
							}
						});

						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					case "delete_customer_review_response": {
						const { responseId } = request.params.arguments as { responseId: string };
						if (!responseId) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"responseId is required"
							);
						}
						await this.axiosInstance.delete(`/customerReviewResponses/${responseId}`, {
							headers: {
								'Authorization': `Bearer ${token}`
							}
						});
						return {
							content: [{
								type: 'text',
								text: `Customer review response ${responseId} deleted successfully.`
							}]
						};
					}

					case "get_customer_review_response": {
						const { reviewId } = request.params.arguments as { reviewId: string };
						if (!reviewId) {
							throw new McpError(
								ErrorCode.InvalidParams,
								"reviewId is required"
							);
						}
						const response = await this.axiosInstance.get(`/customerReviews/${reviewId}/response`, {
							headers: {
								'Authorization': `Bearer ${token}`
							}
						});
						return {
							content: [{
								type: 'text',
								text: JSON.stringify(response.data, null, 2)
							}]
						};
					}

					default:
						throw new McpError(
							ErrorCode.MethodNotFound,
							`Unknown tool: ${request.params.name}`
						);
				}
			} catch (error) {
				if (axios.isAxiosError(error)) {
					throw new McpError(
						ErrorCode.InternalError,
						`App Store Connect API error: ${error.response?.data?.errors?.[0]?.detail ?? error.message}`
					);
				}
				throw error;
			}
		});
	}

	async run(): Promise<void> {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("App Store Connect MCP server running on stdio");
	}
}

// Start the server
const server = new AppStoreConnectServer();
server.run().catch(console.error); 