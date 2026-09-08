export interface ICurrentUserInfo {
  costCenterName: string;

  /**
   * Optional e-mail address. Present only when the sign-in response includes it; it is one of the
   * values behind the `{email}` placeholder in an external menu URL.
   */
  email?: string;

  name: string;

  /** Optional avatar image URL. Falls back to initials when absent. */
  pictureUrl?: string;

  /** Optional job position/title shown under the user name. Line is hidden when absent. */
  position?: string;

  /**
   * Optional stable user identifier. Present only when the sign-in response includes it; it is
   * the value behind the `{userId}` placeholder in an external menu URL.
   */
  userID?: number;

  /**
   * Login user name. Already carried by the persisted sign-in response; declared here because it
   * is the value behind the `{userName}` placeholder in an external menu URL.
   */
  username?: string;
}
